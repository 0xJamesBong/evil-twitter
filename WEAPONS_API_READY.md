# Weapons API - Ready for Frontend Integration

## ✅ Backend Status

The backend is now fully functional with weapons support!

## 🔧 What's Been Done

### 1. Code Changes

- ✅ Replaced all `author_id` with `owner_id` across the codebase
- ✅ Added `Weapon` model with health, damage, and degradation mechanics
- ✅ Added `weapon_ids` field to User model
- ✅ Created weapons routes module
- ✅ Added weapons endpoints to OpenAPI documentation

### 2. API Endpoints

#### Create Weapon

```
POST /weapons/{user_id}
```

**Request Body:**

```json
{
  "name": "Sword of Truth",
  "description": "Cuts through nonsense arguments",
  "image_url": "https://example.com/weapon.jpg",
  "damage": 100
}
```

**Response (201 Created):**

```json
{
  "id": "507f1f77bcf86cd799439011",
  "owner_id": "507f1f77bcf86cd799439011",
  "name": "Sword of Truth",
  "description": "Cuts through nonsense arguments",
  "image_url": "https://example.com/weapon.jpg",
  "damage": 100,
  "health": 10000,
  "max_health": 10000,
  "degrade_per_use": 1
}
```

### 3. Weapon Properties

- **Health**: Weapons start with 10,000 health
- **Damage**: Configurable damage amount (affects tweets)
- **Degradation**: Weapons degrade by 1 point per use
- **Broken State**: Weapons become unusable when health reaches 0

### 4. Database Schema

```typescript
// Weapon document in MongoDB
{
  _id: ObjectId,
  owner_id: string,
  name: string,
  description: string,
  image_url: string,
  damage: number,
  health: number,
  max_health: number,
  degrade_per_use: number
}

// User document includes:
{
  // ... other fields
  weapon_ids: ObjectId[]  // Array of weapon references
}
```

## 🚀 Frontend Integration Guide

### 1. Create Weapon Service

```typescript
// lib/services/weaponsApi.ts
import { API_BASE_URL } from "./api";

export interface CreateWeaponRequest {
  name: string;
  description: string;
  image_url: string;
  damage: number;
}

export interface Weapon {
  id: { $oid: string };
  owner_id: string;
  name: string;
  description: string;
  image_url: string;
  damage: number;
  health: number;
  max_health: number;
  degrade_per_use: number;
}

export const weaponsApi = {
  async createWeapon(
    userId: string,
    weapon: CreateWeaponRequest
  ): Promise<Weapon> {
    const response = await fetch(`${API_BASE_URL}/weapons/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weapon),
    });

    if (!response.ok) {
      throw new Error("Failed to create weapon");
    }

    return response.json();
  },
};
```

### 2. Create Weapons Store (Zustand)

```typescript
// lib/stores/weaponsStore.ts
import { create } from "zustand";
import {
  weaponsApi,
  Weapon,
  CreateWeaponRequest,
} from "../services/weaponsApi";

interface WeaponsState {
  weapons: Weapon[];
  isLoading: boolean;
  error: string | null;

  createWeapon: (userId: string, weapon: CreateWeaponRequest) => Promise<void>;
}

export const useWeaponsStore = create<WeaponsState>((set) => ({
  weapons: [],
  isLoading: false,
  error: null,

  createWeapon: async (userId: string, weapon: CreateWeaponRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newWeapon = await weaponsApi.createWeapon(userId, weapon);
      set((state) => ({
        weapons: [...state.weapons, newWeapon],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
```

### 3. Create Weapon Minting Component

```typescript
// components/WeaponMinter.tsx
"use client";

import { useState } from "react";
import { useWeaponsStore } from "@/lib/stores/weaponsStore";
import { useBackendUserStore } from "@/lib/stores/backendUserStore";

export function WeaponMinter() {
  const { createWeapon, isLoading } = useWeaponsStore();
  const { backendUser } = useBackendUserStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [damage, setDamage] = useState(100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendUser?._id?.$oid) return;

    await createWeapon(backendUser._id.$oid, {
      name,
      description,
      image_url: imageUrl,
      damage,
    });

    // Reset form
    setName("");
    setDescription("");
    setImageUrl("");
    setDamage(100);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Mint a Weapon</h2>

      <input
        type="text"
        placeholder="Weapon Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />

      <input
        type="url"
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="Damage"
        value={damage}
        onChange={(e) => setDamage(Number(e.target.value))}
        min="1"
        max="1000"
        required
      />

      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? "Minting..." : "Mint Weapon"}
      </button>
    </form>
  );
}
```

## 📝 Next Steps for Frontend

1. **Create the services and stores** as shown above
2. **Add WeaponMinter component** to your app (maybe in a new `/weapons` page)
3. **Display user's weapons** - fetch weapons by user ID
4. **Implement weapon usage** - allow users to attack tweets with weapons
5. **Show weapon stats** - health bars, damage indicators, etc.

## 🧪 Testing the API

### Test weapon creation:

```bash
curl -X POST http://localhost:3000/weapons/USER_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Sword",
    "description": "A test weapon",
    "image_url": "https://example.com/sword.jpg",
    "damage": 150
  }'
```

## 📚 API Documentation

Visit `http://localhost:3000/doc` to see the full Swagger UI documentation with all endpoints, schemas, and examples.

---

**Backend is ready and running on `http://localhost:3000`**
**All weapons functionality is live and ready for frontend integration!** 🎉
