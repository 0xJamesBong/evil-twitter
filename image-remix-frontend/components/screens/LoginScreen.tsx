// screens/LoginScreen.tsx
import React, { useState } from 'react'
import { View, TextInput, Button, Alert } from 'react-native'
import { signIn } from '../../lib/auth'

export default function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async () => {
        try {
            await signIn(email, password)
            Alert.alert('Logged in!')
        } catch (err: any) {
            Alert.alert('Login failed', err.message)
        }
    }

    return (
        <View style={{ padding: 20 }}>
            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={{ marginBottom: 10, borderBottomWidth: 1 }}
            />
            <TextInput
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={{ marginBottom: 10, borderBottomWidth: 1 }}
            />
            <Button title="Login" onPress={handleLogin} />
        </View>
    )
}
