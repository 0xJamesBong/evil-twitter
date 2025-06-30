use bson::Uuid;
use models::{
    event::{Event, EventData},
    notification::Notification,
};

use crate::organization::http::BalanceHistoryMaterialized;

#[derive(Debug, serde::Serialize)]
pub struct EventMaterialized {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub data: EventDataMaterialized,
    pub created_at: u64,
}

#[derive(Debug, serde::Serialize)]
pub enum EventDataMaterialized {
    NewNotification(Notification),
    CustodialBalanceUpdated(BalanceHistoryMaterialized),
}

impl From<&EventData> for EventDataMaterialized {
    fn from(data: &EventData) -> Self {
        match data {
            EventData::NewNotification(notification) => {
                EventDataMaterialized::NewNotification(notification.clone())
            }
            EventData::CustodialBalanceUpdated(balance_history) => {
                EventDataMaterialized::CustodialBalanceUpdated(BalanceHistoryMaterialized::from(
                    balance_history.clone(),
                ))
            }
        }
    }
}

impl From<Event> for EventMaterialized {
    fn from(event: Event) -> Self {
        Self {
            id: event.id,
            user_id: event.user_id,
            data: EventDataMaterialized::from(&event.data),
            created_at: (event.created_at.timestamp_millis() / 1000) as u64,
        }
    }
}
