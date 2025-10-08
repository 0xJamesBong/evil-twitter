import React from "react";
import { View, StyleSheet, Platform, useWindowDimensions, ScrollView } from "react-native";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";

interface Props {
    children: React.ReactNode;
}

export const AppLayout: React.FC<Props> = ({ children }) => {
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === "web";
    const isWide = width >= 900;

    if (!isWeb || !isWide) {
        // MOBILE / TABLET LAYOUT
        return (
            <View style={styles.mobileContainer}>
                <Navbar />
                <ScrollView style={styles.mobileContent} contentContainerStyle={{ paddingBottom: 80 }}>
                    {children}
                </ScrollView>
            </View>
        );
    }

    // WEB / DESKTOP LAYOUT
    return (
        <View style={styles.container}>
            <Navbar />
            <View style={styles.mainContent}>
                <View style={styles.leftSidebar}>
                    <Sidebar />
                </View>
                <View style={styles.centerContainer}>
                    <ScrollView
                        style={styles.centerScroll}
                        contentContainerStyle={styles.centerContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        alwaysBounceVertical={false}
                    >
                        {children}
                    </ScrollView>
                </View>
                <View style={styles.rightSidebar}>
                    <RightSidebar />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // --- web layout ---
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    mainContent: {
        flex: 1,
        flexDirection: "row",
        paddingTop: 64,
        maxWidth: 1200,
        marginHorizontal: "auto",
        width: "100%",
    },
    leftSidebar: {
        width: 256,
        borderRightWidth: 1,
        borderRightColor: "#333",
        flexShrink: 0,
    },
    centerContainer: {
        flex: 1,
        minWidth: 0,
    },
    centerScroll: {
        flex: 1,
    },
    centerContent: {
        flexGrow: 1,
        alignItems: "stretch",
        minWidth: 0,
        backgroundColor: "#000",
        paddingBottom: 120, // Increased padding to ensure content isn't cut off
    },
    rightSidebar: {
        width: 320,
        borderLeftWidth: 1,
        borderLeftColor: "#333",
        padding: 16,
        flexShrink: 0,
    },
    // --- mobile layout ---
    mobileContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    mobileContent: {
        flex: 1,
        backgroundColor: "#000",
    },
});