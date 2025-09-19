use std::{collections::HashMap, sync::Arc};

use bson::Uuid;
use models::event::Event;
use socketioxide::{
    extract::{Data, Extension, SocketRef, State},
    layer::SocketIoLayer,
    SocketIo,
};
use tokio::sync::{broadcast::Sender, Mutex};
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

use crate::{app_state::AppState, ws::http::EventMaterialized};

type UserId = Uuid;
type OrganizationId = Uuid;

type UserSubscriptionStore = HashMap<UserId, Sender<Event>>;
type OrgSubscriptionStore = HashMap<Option<OrganizationId>, Sender<Event>>;
type Store = Arc<Mutex<(UserSubscriptionStore, OrgSubscriptionStore)>>;

#[derive(Debug, serde::Deserialize)]
struct SubscribeEventReq {
    pub jwt: String,
}

struct Session {
    pub user_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,
    pub disconnected: bool,
    pub event_subscribed: bool,
}

impl Session {
    pub fn new() -> Self {
        Self {
            user_id: None,
            organization_id: None,
            disconnected: false,
            event_subscribed: false,
        }
    }

    pub fn disconnect(&mut self) {
        self.disconnected = true;
    }

    pub fn set_user_id(&mut self, user_id: Uuid) {
        self.user_id = Some(user_id);
    }

    pub fn set_organization_id(&mut self, organization_id: Option<Uuid>) {
        self.organization_id = organization_id;
    }

    pub fn subscribe_event(&mut self) {
        self.event_subscribed = true;
    }
}

async fn on_connect(socket: SocketRef) {
    let session = Arc::new(Mutex::new(Session::new()));
    socket.extensions.insert(session);

    socket.on(
        "subscribe_event",
        async |s: SocketRef,
               Data(data): Data<SubscribeEventReq>,
               state: State<Arc<AppState>>,
               store: State<Store>,
               Extension::<Arc<Mutex<Session>>>(session)| {
            if session.lock().await.event_subscribed {
                _ = s.emit("subscribe_event", "connected");
                return;
            }
            let user_id = state.auth_service.verify_jwt(&data.jwt).await;
            let Ok(user_id) = user_id else {
                _ = s.emit("subscribe_event", "invalid_jwt");
                return;
            };

            let user = state.mongo_service.get_user(&user_id, None).await;
            let Some(user) = user else { return };
            let org_id = user.organization;

            {
                let mut session_lock = session.lock().await;
                session_lock.set_user_id(user.id);
                session_lock.set_organization_id(org_id);
                session_lock.subscribe_event();
            }

            let mut store_lock = store.lock().await;
            let (user_store, org_store) = &mut *store_lock;
            let user_receiver = {
                user_store
                    .get(&user_id)
                    .map(|sender| sender.subscribe())
                    .unwrap_or_else(|| {
                        let (sender, receiver) = tokio::sync::broadcast::channel(16);
                        user_store.insert(user_id, sender);
                        receiver
                    })
            };

            let org_receiver = {
                org_store
                    .get(&org_id)
                    .map(|sender| sender.subscribe())
                    .unwrap_or_else(|| {
                        let (sender, receiver) = tokio::sync::broadcast::channel(16);
                        org_store.insert(org_id, sender);
                        receiver
                    })
            };

            drop(store_lock);

            let user_stream = BroadcastStream::new(user_receiver);
            let org_stream = BroadcastStream::new(org_receiver);
            let mut stream = user_stream.merge(org_stream);

            _ = s.emit("subscribe_event", "connected");

            while let Some(Ok(event)) = stream.next().await {
                if session.lock().await.disconnected {
                    break;
                }
                _ = s.emit("new_event", &EventMaterialized::from(event));
            }
        },
    );

    socket.on_disconnect(
        async |Extension::<Arc<Mutex<Session>>>(session), store: State<Store>| {
            let mut session_lock = session.lock().await;
            session_lock.disconnect();
            let Some(user_id) = session_lock.user_id else {
                return;
            };

            let org_id = session_lock.organization_id;

            drop(session_lock);

            let (user_store, org_store) = &mut *store.lock().await;
            if let Some(sender) = user_store.get_mut(&user_id) {
                if sender.receiver_count() <= 1 {
                    user_store.remove(&user_id);
                }
            };

            if let Some(sender) = org_store.get_mut(&org_id) {
                if sender.receiver_count() <= 1 {
                    org_store.remove(&org_id);
                }
            };
        },
    );
}

pub fn ws_route(state: Arc<AppState>) -> SocketIoLayer {
    let user_store: UserSubscriptionStore = HashMap::new();
    let org_store: OrgSubscriptionStore = HashMap::new();
    let store = Arc::new(Mutex::new((user_store, org_store)));
    let (layer, io) = SocketIo::builder()
        .with_state(state.clone())
        .with_state(store.clone())
        .build_layer();

    io.ns("/", on_connect);

    tokio::spawn({
        let state = state.clone();
        async move {
            loop {
                let mut event = state.mongo_service.subscribe_event().await;
                while let Some(event) = event.recv().await {
                    let mut store_lock = store.lock().await;
                    let (user_store, org_store) = &mut *store_lock;
                    if let Some(user_id) = event.user_id {
                        if let Some(sender) = user_store.get_mut(&user_id) {
                            _ = sender.send(event.clone());
                        }
                    };
                    if let Some(organization_id) = event.organization_id {
                        if let Some(sender) = org_store.get_mut(&Some(organization_id)) {
                            _ = sender.send(event);
                        }
                    }
                }
            }
        }
    });

    layer
}
