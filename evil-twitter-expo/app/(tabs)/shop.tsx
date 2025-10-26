import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
  Divider,
} from "react-native-paper";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";
import {
  ShopItem,
  UserAsset,
  MarketplaceListing,
  useEconomyStore,
} from "@/lib/stores/economyStore";

const formatNumber = (value: number): string =>
  new Intl.NumberFormat().format(value);

const canListAsset = (asset: UserAsset): boolean =>
  asset.tradeable &&
  !asset.isLocked &&
  asset.status?.toLowerCase() === "active";

const isListingActive = (listing: MarketplaceListing): boolean =>
  listing.status?.toLowerCase() === "active";

export default function ShopScreen() {
  const { user } = useBackendUserStore();
  const userId = user?._id?.$oid ?? "";
  const [initialised, setInitialised] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listModal, setListModal] = useState<{
    visible: boolean;
    asset: UserAsset | null;
    price: string;
    feeBps: string;
    token: string;
    error: string | null;
  }>({
    visible: false,
    asset: null,
    price: "",
    feeBps: "250",
    token: "EVL",
    error: null,
  });

  const {
    balances,
    assets,
    shopItems,
    listings,
    loading,
    actionState,
    error,
    marketplaceError,
    selectedToken,
    setSelectedToken,
    refreshAll,
    buyShopItem,
    listAsset,
    purchaseListing,
    cancelListing,
    clearErrors,
  } = useEconomyStore();

  useEffect(() => {
    if (selectedToken && !listModal.visible) {
      setListModal((prev) => ({
        ...prev,
        token: selectedToken,
      }));
    }
  }, [selectedToken, listModal.visible]);

  useEffect(() => {
    if (userId && !initialised) {
      setInitialised(true);
      refreshAll(userId);
    }
  }, [userId, initialised, refreshAll]);

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    await refreshAll(userId);
    setRefreshing(false);
  };

  const handleBuyShopItem = async (itemId: string) => {
    if (!userId) return;
    await buyShopItem(userId, itemId);
  };

  const openListModal = (asset: UserAsset) => {
    setListModal({
      visible: true,
      asset,
      price: "",
      feeBps: "250",
      token: selectedToken,
      error: null,
    });
  };

  const closeListModal = () =>
    setListModal({
      visible: false,
      asset: null,
      price: "",
      feeBps: "250",
      token: selectedToken,
      error: null,
    });

  const handleSubmitListing = async () => {
    if (!listModal.asset || !userId) {
      return;
    }

    const parsedPrice = Number(listModal.price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setListModal((prev) => ({
        ...prev,
        error: "Enter a valid price greater than zero.",
      }));
      return;
    }

    const parsedFee = Number(listModal.feeBps || "250");
    if (Number.isNaN(parsedFee) || parsedFee < 0) {
      setListModal((prev) => ({
        ...prev,
        error: "Fee must be zero or a positive number.",
      }));
      return;
    }

    const result = await listAsset({
      assetId: listModal.asset.id,
      priceToken: listModal.token,
      priceAmount: parsedPrice,
      feeBps: parsedFee,
      userId,
    });

    if (!result.success) {
      setListModal((prev) => ({
        ...prev,
        error: result.error ?? "Unable to create listing.",
      }));
      return;
    }

    closeListModal();
  };

  const handlePurchaseListing = async (listingId: string) => {
    if (!userId) return;
    await purchaseListing(listingId, userId);
  };

  const handleCancelListing = async (listingId: string) => {
    if (!userId) return;
    await cancelListing(listingId, userId);
  };

  const activeShopItems = useMemo(
    () => shopItems.filter((item) => item.isActive),
    [shopItems]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vault</Text>
            <Button
              compact
              mode="outlined"
              onPress={handleRefresh}
              icon="refresh"
              disabled={!userId}
            >
              Refresh
            </Button>
          </View>
          {loading.balances ? (
            <View style={styles.centered}>
              <ActivityIndicator />
              <Text style={styles.muted}>Loading balances...</Text>
            </View>
          ) : balances.length > 0 ? (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.balanceRow}>
                  {balances.map((balance) => (
                    <Chip
                      key={balance.id}
                      mode="outlined"
                      selected={selectedToken === balance.tokenSymbol}
                      style={styles.balanceChip}
                      onPress={() => setSelectedToken(balance.tokenSymbol)}
                    >
                      {balance.tokenSymbol} • {formatNumber(balance.available)}
                      {balance.locked > 0
                        ? ` (locked ${formatNumber(balance.locked)})`
                        : ""}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
            </Card>
          ) : (
            <Text style={styles.muted}>
              No balances found yet. Complete missions or trade to earn tokens.
            </Text>
          )}
        </View>

        {error && (
          <Card style={[styles.card, styles.errorCard]}>
            <Card.Content style={styles.cardRow}>
              <Text style={styles.errorText}>{error}</Text>
              <Button mode="text" onPress={clearErrors}>
                Dismiss
              </Button>
            </Card.Content>
          </Card>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Infernal Shop</Text>
          </View>
          {loading.shop ? (
            <View style={styles.centered}>
              <ActivityIndicator />
              <Text style={styles.muted}>Summoning catalog...</Text>
            </View>
          ) : activeShopItems.length > 0 ? (
            activeShopItems.map((item: ShopItem) => (
              <Card key={item.id} style={styles.card}>
                <Card.Title
                  title={item.name}
                  subtitle={
                    item.remainingSupply != null
                      ? `Supply: ${item.remainingSupply}${
                          item.totalSupply != null
                            ? ` / ${item.totalSupply}`
                            : ""
                        }`
                      : undefined
                  }
                />
                <Card.Content>
                  {item.description ? (
                    <Text style={styles.descriptionText}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.priceRow}>
                    <Chip mode="outlined">
                      {formatNumber(item.priceAmount)} {item.priceToken}
                    </Chip>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <Button
                    mode="contained"
                    onPress={() => handleBuyShopItem(item.id)}
                    loading={actionState.purchasingItem === item.id}
                    disabled={
                      !userId || actionState.purchasingItem === item.id
                    }
                  >
                    Buy
                  </Button>
                </Card.Actions>
              </Card>
            ))
          ) : (
            <Text style={styles.muted}>
              The infernal shopkeeper has nothing on display right now.
            </Text>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Arsenal</Text>
          </View>
          {loading.assets ? (
            <View style={styles.centered}>
              <ActivityIndicator />
              <Text style={styles.muted}>Loading your arsenal...</Text>
            </View>
          ) : assets.length > 0 ? (
            assets.map((asset: UserAsset) => {
              const status = asset.status?.toUpperCase() ?? "UNKNOWN";
              const statusColor =
                asset.status?.toLowerCase() === "listed"
                  ? "#f39c12"
                  : asset.isLocked
                  ? "#c0392b"
                  : "#2ecc71";
              return (
                <Card key={asset.id} style={styles.card}>
                  <Card.Title
                    title={asset.name}
                    subtitle={`Type: ${asset.assetType}`}
                    right={() => (
                      <Chip
                        mode="outlined"
                        style={[styles.statusChip, { borderColor: statusColor }]}
                        textStyle={{ color: statusColor }}
                      >
                        {status}
                      </Chip>
                    )}
                  />
                  <Card.Content>
                    {asset.description ? (
                      <Text style={styles.descriptionText}>
                        {asset.description}
                      </Text>
                    ) : null}
                    {asset.attributes ? (
                      <Text style={styles.attributesText}>
                        Attributes:{" "}
                        {JSON.stringify(asset.attributes, null, 2).slice(0, 120)}
                      </Text>
                    ) : null}
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      mode="outlined"
                      onPress={() => openListModal(asset)}
                      disabled={!canListAsset(asset) || !userId}
                    >
                      List for Sale
                    </Button>
                  </Card.Actions>
                </Card>
              );
            })
          ) : (
            <Text style={styles.muted}>
              You have no assets yet. Acquire tools or rewards from the shop or
              marketplace.
            </Text>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Marketplace</Text>
          </View>
          {marketplaceError ? (
            <Card style={[styles.card, styles.errorCard]}>
              <Card.Content style={styles.cardRow}>
                <Text style={styles.errorText}>{marketplaceError}</Text>
                <Button mode="text" onPress={clearErrors}>
                  Dismiss
                </Button>
              </Card.Content>
            </Card>
          ) : null}

          {loading.listings ? (
            <View style={styles.centered}>
              <ActivityIndicator />
              <Text style={styles.muted}>Syncing the dark bazaar...</Text>
            </View>
          ) : listings.length > 0 ? (
            listings.map((listing: MarketplaceListing) => {
              const sellerOwns = listing.sellerId === userId;
              const active = isListingActive(listing);
              return (
                <Card key={listing.id} style={styles.card}>
                  <Card.Title
                    title={`${formatNumber(listing.priceAmount)} ${
                      listing.priceToken
                    }`}
                    subtitle={`Fee: ${(listing.feeBps / 100).toFixed(2)}%`}
                    right={() => (
                      <Chip
                        mode="outlined"
                        style={styles.marketChip}
                        textStyle={{
                          color: active ? "#2ecc71" : "#bdc3c7",
                        }}
                      >
                        {listing.status?.toUpperCase()}
                      </Chip>
                    )}
                  />
                  <Card.Content>
                    <Text style={styles.descriptionText}>
                      Asset: {listing.assetId}
                    </Text>
                    <Text style={styles.muted}>
                      Seller: {listing.sellerId}
                    </Text>
                    {listing.buyerId ? (
                      <Text style={styles.muted}>
                        Buyer: {listing.buyerId}
                      </Text>
                    ) : null}
                  </Card.Content>
                  <Card.Actions>
                    {sellerOwns ? (
                      <Button
                        mode="outlined"
                        onPress={() => handleCancelListing(listing.id)}
                        disabled={
                          !active ||
                          actionState.cancellingListing === listing.id
                        }
                        loading={actionState.cancellingListing === listing.id}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        mode="contained"
                        onPress={() => handlePurchaseListing(listing.id)}
                        disabled={
                          !active ||
                          !userId ||
                          actionState.purchasingListing === listing.id
                        }
                        loading={actionState.purchasingListing === listing.id}
                      >
                        Buy
                      </Button>
                    )}
                  </Card.Actions>
                </Card>
              );
            })
          ) : (
            <Text style={styles.muted}>
              No active listings yet. Stake your claim by listing a prized
              possession.
            </Text>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={listModal.visible} onDismiss={closeListModal}>
          <Dialog.Title>
            {listModal.asset ? `List ${listModal.asset.name}` : "List Asset"}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Price"
              value={listModal.price}
              onChangeText={(price) =>
                setListModal((prev) => ({ ...prev, price }))
              }
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Fee (bps)"
              value={listModal.feeBps}
              onChangeText={(feeBps) =>
                setListModal((prev) => ({ ...prev, feeBps }))
              }
              keyboardType="numeric"
              style={styles.input}
            />
            <View style={styles.balanceRow}>
              {balances.map((balance) => (
                <Chip
                  key={`dialog-${balance.id}`}
                  selected={listModal.token === balance.tokenSymbol}
                  onPress={() =>
                    setListModal((prev) => ({
                      ...prev,
                      token: balance.tokenSymbol,
                    }))
                  }
                  style={styles.balanceChip}
                >
                  {balance.tokenSymbol}
                </Chip>
              ))}
            </View>
            {listModal.error ? (
              <HelperText type="error" visible>
                {listModal.error}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeListModal}>Cancel</Button>
            <Button
              onPress={handleSubmitListing}
              mode="contained"
              loading={actionState.listingAsset}
              disabled={actionState.listingAsset}
            >
              List
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 64,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  card: {
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  balanceChip: {
    backgroundColor: "transparent",
  },
  statusChip: {
    marginRight: 16,
  },
  marketChip: {
    marginRight: 16,
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: "#333",
  },
  centered: {
    alignItems: "center",
    gap: 8,
  },
  muted: {
    color: "#888",
  },
  descriptionText: {
    color: "#ddd",
    lineHeight: 20,
  },
  attributesText: {
    color: "#aaa",
    marginTop: 8,
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: "#4d1f1f",
  },
  errorText: {
    color: "#ffb3b3",
    flex: 1,
  },
  input: {
    marginBottom: 12,
  },
});

