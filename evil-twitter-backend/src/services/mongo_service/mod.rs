// use futures::{StreamExt, stream::TryStreamExt};
// use lru::LruCache;
// use models::{
//     admin::AdminLog,
//     balance_history::BalanceHistory,
//     chain::Chain,
//     config::Config,
//     denied_jwt::DeniedJwt,
//     deposit::Deposit,
//     email_verification_code::{EmailVerificationCode, ResourceId},
//     event::Event,
//     issuance::{Issuance, IssuanceStatus},
//     notification::{Notification, NotificationData},
//     organizations::{Organization, subaccount_policy_assign_log::SubaccountPolicyAssignLog},
//     redemption::{Redemption, RedemptionStatus},
//     settlement_statement::SettlementStatement,
//     token_stats::TokenStats,
//     transactions::AccountTransaction,
//     users::User,
//     withdrawals::{Withdrawal, WithdrawalStatus},
// };
// use serde::{Deserialize, Serialize};
// use std::{
//     borrow::BorrowMut,
//     num::NonZeroUsize,
//     path::PathBuf,
//     time::{Duration, SystemTime},
// };
// use tokio::{sync::mpsc, time::sleep};
// use tracing::{debug, info, warn};

// use bson::{DateTime, Uuid, doc};
// use mongodb::{
//     ClientSession, Database, IndexModel,
//     change_stream::event::OperationType,
//     options::{
//         ChangeStreamOptions, FullDocumentType, IndexOptions, ReadPreference, SelectionCriteria,
//         TlsOptions,
//     },
// };

// use crate::{consts::COOKIE_EXPIRES_IN, create_indexes, err::AppError};

// pub mod admin_log;
// pub mod balance_history;
// pub mod config;
// pub mod deposit;
// pub mod issuance;
// pub mod macros;
// pub mod notification;
// pub mod organization;
// pub mod redemption;
// pub mod settlement_statement;
// pub mod subaccount_policy;
// pub mod transaction;
// pub mod user;
// pub mod withdrawal;

// #[derive(Clone)]
// pub struct MongoService {
//     client: mongodb::Client,
//     pub database: Database,
// }

// #[derive(Serialize, Deserialize, Debug)]
// #[serde(tag = "type", rename_all = "snake_case")]
// pub enum DWIR {
//     Deposit(Deposit),
//     Issuance(Issuance),
//     Redemption(Redemption),
//     Withdrawal(Withdrawal),
// }

// // No upsert deposit in API, it happens in indexer
// pub enum Upsert<'u> {
//     Withdrawal(&'u mut Withdrawal),
//     Issuance(&'u mut Issuance),
//     Redemption(&'u mut Redemption),
//     OrgNotification(Uuid, NotificationData),
//     Organization(&'u mut Organization),
//     User(&'u User),
//     BalanceHistory(BalanceHistory),
//     EmailVerificationCode(&'u mut EmailVerificationCode),
//     SubaccountPolicyAssignLog(SubaccountPolicyAssignLog),
//     AdminLog(AdminLog),
//     AccountTransaction(AccountTransaction),
// }

// impl MongoService {
//     pub async fn new(uri: &str, ca: &Option<String>) -> Self {
//         let mut options = mongodb::options::ClientOptions::parse(uri).await.unwrap();

//         if let Some(ca) = ca {
//             let ca_file = PathBuf::from(ca);
//             let option = TlsOptions::builder()
//                 .ca_file_path(ca_file)
//                 .allow_invalid_certificates(true)
//                 .build();
//             options.tls = Some(mongodb::options::Tls::Enabled(option));
//         }

//         options.direct_connection = Some(true);
//         options.retry_writes = Some(false);
//         options.selection_criteria =
//             Some(SelectionCriteria::ReadPreference(ReadPreference::Primary));

//         debug!("Connecting to MongoDB");
//         let client = mongodb::Client::with_options(options).expect("Failed to connect to MongoDB");

//         let database = client
//             .default_database()
//             .expect("Failed to get default database");

//         create_indexes!(database, User => {
//             { "email": 1 } => { unique: true },
//         });

//         create_indexes!(database, BalanceHistory => {
//             { "id": 1 } => { unique: true },
//             { "timestamp": -1 } => { unique: false },
//             { "organization_id": 1 } => { unique: false },
//         });

//         create_indexes!(database, Organization => {
//             { "name": 1 } => { unique: true },
//         });

//         create_indexes!(database, Issuance => {
//             { "id": 1 } => { unique: true },
//             { "organization_id": 1 } => { unique: false },
//             { "expired_at": 1 } => { expire_after: Duration::from_secs(0) },
//         });

//         create_indexes!(database, DeniedJwt => {
//             { "hash": 1 } => { unique: true },
//             { "expire_at": 1 } => { expire_after: Duration::from_secs(0) },
//         });

//         create_indexes!(database, Deposit => {
//             { "id": 1 } => { unique: true },
//             { "organization_id": 1 } => { unique: false },
//         });

//         create_indexes!(database, Withdrawal => {
//             { "id": 1 } => { unique: true },
//             { "organization_id": 1 } => { unique: false },
//             { "expired_at": 1 } => { expire_after: Duration::from_secs(0) },
//         });

//         create_indexes!(database, Redemption => {
//             { "id": 1 } => { unique: true },
//             { "organization_id": 1 } => { unique: false },
//             { "expired_at": 1 } => { expire_after: Duration::from_secs(0) },
//         });

//         create_indexes!(database, Notification => {
//             { "id": 1 } => { unique: false },
//             { "user_id": 1 } => { unique: false },
//         });

//         create_indexes!(database, Config => {
//             { "id": 1 } => { unique: true },
//         });

//         create_indexes!(database, EmailVerificationCode => {
//             { "id": 1 } => { unique: true },
//             { "email": 1, "resource_id": 1 } => { unique: false },
//             { "expired_at": 1 } => { expire_after: Duration::from_secs(0) },
//         });

//         create_indexes!(database, Event => {
//             { "id": 1 } => { unique: true },
//             { "created_at": 1 } => { expire_after: Duration::from_secs(600) },
//         });

//         create_indexes!(database, TokenStats => {
//             { "chain": 1 } => { unique: true },
//         });

//         create_indexes!(database, SubaccountPolicyAssignLog => {
//             { "id": 1 } => { unique: true },
//             { "organization_id": 1 } => { unique: false },
//             { "subaccount_id": 1 } => { unique: false },
//             { "user_id": 1 } => { unique: false },
//             { "timestamp": -1 } => { unique: false },
//         });

//         create_indexes!(database, AdminLog => {
//             { "id": 1 } => { unique: true },
//             { "user_id": 1 },
//             { "action": -1 },
//             { "timestamp": -1 },
//         });

//         create_indexes!(database, SettlementStatement => {
//             { "id": 1 } => { unique: true },
//             { "cycle_timestamp": -1 },
//         });

//         database
//             .collection::<AccountTransaction>(AccountTransaction::COLLECTION_NAME)
//             .create_indexes(vec![
//                 IndexModel::builder()
//                     .keys(doc! { "internal_id": -1 })
//                     .options(IndexOptions::builder().unique(true).sparse(true).build())
//                     .build(),
//                 IndexModel::builder()
//                     .keys(doc! { "external_id": -1 })
//                     .options(IndexOptions::builder().unique(true).sparse(true).build())
//                     .build(),
//                 IndexModel::builder()
//                     .keys(doc! { "tx_id": 1, "tx_type": 1 })
//                     .options(
//                         IndexOptions::builder()
//                             .unique(true)
//                             .partial_filter_expression(doc! {
//                                 "tx_type": { "$exists": true },
//                                 "tx_id": { "$exists": true }
//                             })
//                             .build(),
//                     )
//                     .build(),
//                 IndexModel::builder()
//                     .keys(doc! { "created_at": -1 })
//                     .build(),
//             ])
//             .await
//             .expect("Failed to create indexes");

//         client
//             .database("admin")
//             .run_command(doc! {
//               "modifyChangeStreams": 1,
//               "database": database.name(),
//               "collection": Event::COLLECTION_NAME,
//               "enable": true,
//             })
//             .await
//             .expect("Failed to enable event stream");

//         client
//             .database("admin")
//             .run_command(doc! {
//               "modifyChangeStreams": 1,
//               "database": database.name(),
//               "collection": AccountTransaction::COLLECTION_NAME,
//               "enable": true,
//             })
//             .await
//             .expect("Failed to enable account transaction stream");

//         info!("MongoDB Service initialized");
//         Self { client, database }
//     }

//     pub async fn create_session(&self) -> Result<ClientSession, AppError> {
//         let mut session = self.client.start_session().await?;
//         session.start_transaction().await?;
//         Ok(session)
//     }

//     pub async fn commit_session(&self, mut session: ClientSession) -> Result<(), AppError> {
//         session.commit_transaction().await?;
//         Ok(())
//     }

//     pub async fn list_dwir(
//         &self,
//         organization_id: &Uuid,
//         before: u64,
//         limit: i64,
//         user: &User,
//     ) -> Result<(Vec<DWIR>, u64), AppError> {
//         let deposit_collection = self
//             .database
//             .collection::<Deposit>(Deposit::COLLECTION_NAME);
//         let issuance_collection = self
//             .database
//             .collection::<Issuance>(Issuance::COLLECTION_NAME);
//         let redemption_collection = self
//             .database
//             .collection::<Redemption>(Redemption::COLLECTION_NAME);
//         let withdrawal_collection = self
//             .database
//             .collection::<Withdrawal>(Withdrawal::COLLECTION_NAME);

//         let (deposits, total_deposits) = if user.can_view_deposit() {
//             (
//                 deposit_collection
//                     .find(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                         "created_at": { "$lt": bson::to_bson(&before)? }
//                     })
//                     .sort(doc! { "created_at": -1 })
//                     .limit(limit)
//                     .await
//                     .map(|it| it.try_collect::<Vec<Deposit>>())?
//                     .await?
//                     .into_iter()
//                     .map(|it| (it.created_at, DWIR::Deposit(it)))
//                     .collect::<Vec<(u64, DWIR)>>(),
//                 deposit_collection
//                     .count_documents(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                     })
//                     .await?,
//             )
//         } else {
//             (vec![], 0)
//         };

//         let (issuances, total_issuances) = if user.can_view_issuance() {
//             (
//                 issuance_collection
//                     .find(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                         "created_at": { "$lt": bson::to_bson(&before)? },
//                         "status": { "$ne": bson::to_bson(&IssuanceStatus::Created)? }
//                     })
//                     .sort(doc! { "created_at": -1 })
//                     .limit(limit)
//                     .await
//                     .map(|it| it.try_collect::<Vec<Issuance>>())?
//                     .await?
//                     .into_iter()
//                     .map(|it| (it.created_at, DWIR::Issuance(it)))
//                     .collect::<Vec<(u64, DWIR)>>(),
//                 issuance_collection
//                     .count_documents(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                     })
//                     .await?,
//             )
//         } else {
//             (vec![], 0)
//         };

//         let (redemptions, total_redemptions) = if user.can_view_redemption() {
//             (
//                 redemption_collection
//                     .find(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                         "created_at": { "$lt": bson::to_bson(&before)? },
//                         "status": { "$ne": bson::to_bson(&RedemptionStatus::Created)? }
//                     })
//                     .sort(doc! { "created_at": -1 })
//                     .limit(limit)
//                     .await
//                     .map(|it| it.try_collect::<Vec<Redemption>>())?
//                     .await?
//                     .into_iter()
//                     .map(|it| (it.created_at, DWIR::Redemption(it)))
//                     .collect::<Vec<(u64, DWIR)>>(),
//                 redemption_collection
//                     .count_documents(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                     })
//                     .await?,
//             )
//         } else {
//             (vec![], 0)
//         };

//         let (withdrawals, total_withdrawals) = if user.can_view_withdrawal() {
//             (
//                 withdrawal_collection
//                     .find(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                         "created_at": { "$lt": bson::to_bson(&before)? },
//                         "status": { "$ne": bson::to_bson(&WithdrawalStatus::Created)? }
//                     })
//                     .sort(doc! { "created_at": -1 })
//                     .limit(limit)
//                     .await
//                     .map(|it| it.try_collect::<Vec<Withdrawal>>())?
//                     .await?
//                     .into_iter()
//                     .map(|it| (it.created_at, DWIR::Withdrawal(it)))
//                     .collect::<Vec<(u64, DWIR)>>(),
//                 withdrawal_collection
//                     .count_documents(doc! {
//                         "organization_id": bson::to_bson(&organization_id)?,
//                     })
//                     .await?,
//             )
//         } else {
//             (vec![], 0)
//         };

//         let mut list = vec![];
//         list.extend(deposits);
//         list.extend(issuances);
//         list.extend(redemptions);
//         list.extend(withdrawals);

//         list.sort_by(|a, b| b.0.cmp(&a.0));

//         let total = total_deposits + total_issuances + total_redemptions + total_withdrawals;

//         Ok((
//             list.into_iter()
//                 .take(limit as usize)
//                 .map(|it| it.1)
//                 .collect(),
//             total,
//         ))
//     }

//     pub async fn batch_upsert_and_commit<'u>(
//         &self,
//         models: Vec<Upsert<'u>>,
//         session: Option<ClientSession>,
//     ) -> Result<(), AppError> {
//         let mut session = session;
//         for model in models {
//             let session = session.as_mut().map(BorrowMut::borrow_mut);
//             match model {
//                 Upsert::Withdrawal(withdrawal) => {
//                     self.upsert_withdrawal(&withdrawal, session).await?
//                 }
//                 Upsert::Issuance(issuance) => self.upsert_issuance(issuance, session).await?,
//                 Upsert::Redemption(redemption) => {
//                     self.upsert_redemption(redemption, session).await?
//                 }
//                 Upsert::OrgNotification(organization_id, notification_data) => {
//                     self.new_organization_notification(
//                         &organization_id,
//                         notification_data.clone(),
//                         session,
//                     )
//                     .await?
//                 }
//                 Upsert::Organization(organization) => {
//                     self.update_organization(organization, session).await?
//                 }
//                 Upsert::User(user) => self.update_user(user, session).await?,
//                 Upsert::BalanceHistory(balance_history) => {
//                     self.save_balance_history(&balance_history, session).await?
//                 }
//                 Upsert::EmailVerificationCode(email_verification_code) => {
//                     self.save_email_verification_code(email_verification_code, session)
//                         .await?
//                 }
//                 Upsert::SubaccountPolicyAssignLog(subaccount_policy_assign_log) => {
//                     self.upsert_subaccount_policy_assign_log(&subaccount_policy_assign_log, session)
//                         .await?
//                 }
//                 Upsert::AdminLog(admin_log) => self.insert_admin_log(admin_log, session).await?,
//                 Upsert::AccountTransaction(account_transaction) => {
//                     self.upsert_account_transaction(&account_transaction, session)
//                         .await?
//                 }
//             }
//         }

//         if let Some(session) = session {
//             self.commit_session(session).await?;
//         }
//         Ok(())
//     }

//     pub async fn save_email_verification_code(
//         &self,
//         email_verification_code: &EmailVerificationCode,
//         session: Option<&mut ClientSession>,
//     ) -> Result<(), AppError> {
//         let collection = self
//             .database
//             .collection::<EmailVerificationCode>(EmailVerificationCode::COLLECTION_NAME);

//         let mut query = collection.insert_one(email_verification_code);

//         if let Some(session) = session {
//             query = query.session(session);
//         }
//         query.await?;

//         Ok(())
//     }

//     pub async fn use_email_verification_code(
//         &self,
//         email: &str,
//         code: &str,
//         resource_id: impl Into<ResourceId>,
//         session: Option<&mut ClientSession>,
//     ) -> Result<(), AppError> {
//         let collection = self
//             .database
//             .collection::<EmailVerificationCode>(EmailVerificationCode::COLLECTION_NAME);

//         let resource_id: ResourceId = resource_id.into();
//         let mut query = collection.update_one(
//             doc! {
//                 "email": bson::to_bson(&email)?,
//                 "code": bson::to_bson(&code)?,
//                 "resource_id": bson::to_bson(&resource_id)?,
//                 "used": false,
//                 "expired_at": { "$gt": DateTime::from_system_time(SystemTime::now()) }
//             },
//             doc! { "$set": { "used": true } },
//         );

//         if let Some(session) = session {
//             query = query.session(session);
//         }

//         let result = query.await?;

//         if result.modified_count == 0 {
//             Err(AppError::IncorrectEmailVerificationCode)
//         } else {
//             Ok(())
//         }
//     }

//     pub async fn subscribe_event(&self) -> mpsc::UnboundedReceiver<Event> {
//         let (sender, receiver) = mpsc::unbounded_channel();
//         let collection = self.database.collection::<Event>(Event::COLLECTION_NAME);

//         tokio::spawn(async move {
//             loop {
//                 let Ok(mut result) = collection
//                     .watch()
//                     .pipeline(vec![
//                         doc! { "$match" : doc! { "operationType" : "insert" } },
//                     ])
//                     .await
//                 else {
//                     warn!("Failed to subscribe to mongodb events stream, sleep and retry...");
//                     sleep(Duration::from_secs(5)).await;
//                     continue;
//                 };

//                 while let Some(Ok(event)) = result.next().await {
//                     if event.operation_type == OperationType::Insert {
//                         _ = sender.send(event.full_document.unwrap());
//                     }
//                 }
//                 warn!("MongoDB event stream has ended, reconnecting...");
//             }
//         });

//         receiver
//     }

//     pub async fn subscribe_account_tx(&self) -> mpsc::UnboundedReceiver<AccountTransaction> {
//         let (sender, receiver) = mpsc::unbounded_channel();
//         let collection = self
//             .database
//             .collection::<AccountTransaction>(AccountTransaction::COLLECTION_NAME);

//         tokio::spawn(async move {
//             // dedupe the account transactions, the operationType `update` will trigger multiple times for the same account transaction
//             // key format: `{account_transaction_id}-{status}`
//             let mut dedupe_cache = LruCache::new(NonZeroUsize::new(64).unwrap());

//             loop {
//                 let options = ChangeStreamOptions::builder()
//                     .full_document(Some(FullDocumentType::UpdateLookup))
//                     .build();

//                 let Ok(mut result) = collection
//                     .watch()
//                     .pipeline(vec![doc! {
//                         "$match" : {
//                             "$or": [
//                                 { "operationType" : "insert" },
//                                 { "operationType" : "update" },
//                                 { "operationType" : "replace" }
//                             ]
//                         }
//                     }])
//                     .with_options(options)
//                     .await
//                 else {
//                     warn!("Failed to subscribe to mongodb events stream, sleep and retry...");
//                     sleep(Duration::from_secs(5)).await;
//                     continue;
//                 };

//                 while let Some(Ok(event)) = result.next().await {
//                     match event.operation_type {
//                         OperationType::Insert | OperationType::Update | OperationType::Replace => {
//                             let document = event.full_document.unwrap();
//                             let cache_key = format!(
//                                 "{:?}-{:?}-{:?}",
//                                 document.internal_id, document.external_id, document.status
//                             );
//                             if dedupe_cache.contains(&cache_key) {
//                                 continue;
//                             }
//                             dedupe_cache.put(cache_key, ());
//                             _ = sender.send(document);
//                         }
//                         _ => {}
//                     }
//                 }
//                 warn!("MongoDB event stream has ended, reconnecting...");
//             }
//         });

//         receiver
//     }

//     pub async fn list_token_stats(&self) -> Result<Vec<TokenStats>, AppError> {
//         let collection = self
//             .database
//             .collection::<TokenStats>(TokenStats::COLLECTION_NAME);
//         let result = collection
//             .find(doc! {})
//             .await
//             .map(|it| it.try_collect::<Vec<TokenStats>>())?
//             .await?;
//         Ok(result)
//     }

//     pub async fn get_token_stats(&self, chain: Chain) -> Result<TokenStats, AppError> {
//         let collection = self
//             .database
//             .collection::<TokenStats>(TokenStats::COLLECTION_NAME);
//         let result = collection
//             .find_one(doc! {
//                 "chain": bson::to_bson(&chain)?
//             })
//             .await
//             .map(|it| it.ok_or(AppError::NotFound))?;

//         result
//     }

//     pub async fn is_denied_jwt(&self, hash: &str) -> Result<bool, AppError> {
//         let collection = self
//             .database
//             .collection::<DeniedJwt>(DeniedJwt::COLLECTION_NAME);
//         let result = collection
//             .find_one(doc! {
//                 "hash": bson::to_bson(&hash)?
//             })
//             .await
//             .map(|it| it.is_some())
//             .unwrap_or(false);

//         Ok(result)
//     }

//     pub async fn insert_denied_jwt(&self, hash: &str) -> Result<(), AppError> {
//         let collection = self
//             .database
//             .collection::<DeniedJwt>(DeniedJwt::COLLECTION_NAME);
//         let expire_at = DateTime::from_system_time(
//             SystemTime::now() + Duration::from_secs(COOKIE_EXPIRES_IN as u64),
//         );
//         _ = collection
//             .insert_one(DeniedJwt {
//                 hash: hash.to_string(),
//                 expire_at,
//             })
//             .await
//             .map_err(|e| AppError::MongoError(e))?;

//         Ok(())
//     }
// }
