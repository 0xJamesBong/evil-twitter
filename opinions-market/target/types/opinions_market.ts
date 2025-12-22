/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/opinions_market.json`.
 */
export type OpinionsMarket = {
  "address": "4z5rjroGdWmgGX13SdFsh4wRM4jJkMUrcvYrNpV3gezm",
  "metadata": {
    "name": "opinionsMarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "ping",
      "discriminator": [
        173,
        0,
        94,
        236,
        73,
        133,
        225,
        153
      ],
      "accounts": [],
      "args": []
    }
  ],
  "events": [
    {
      "name": "tipReceived",
      "discriminator": [
        24,
        50,
        123,
        10,
        169,
        249,
        154,
        112
      ]
    },
    {
      "name": "tipsClaimed",
      "discriminator": [
        175,
        220,
        250,
        223,
        98,
        113,
        43,
        55
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "postNotOpen",
      "msg": "Post is not open"
    },
    {
      "code": 6001,
      "name": "postExpired",
      "msg": "Post is expired"
    },
    {
      "code": 6002,
      "name": "postAlreadySettled",
      "msg": "Post already settled"
    },
    {
      "code": 6003,
      "name": "postNotExpired",
      "msg": "Post not yet expired"
    },
    {
      "code": 6004,
      "name": "postNotSettled",
      "msg": "Post not settled"
    },
    {
      "code": 6005,
      "name": "noWinner",
      "msg": "No winner for this post"
    },
    {
      "code": 6006,
      "name": "alreadyClaimed",
      "msg": "Reward already claimed"
    },
    {
      "code": 6007,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6008,
      "name": "zeroVotes",
      "msg": "Zero votes not allowed"
    },
    {
      "code": 6009,
      "name": "mintNotEnabled",
      "msg": "Mint is not enabled"
    },
    {
      "code": 6010,
      "name": "blingCannotBeAlternativePayment",
      "msg": "BLING cannot be registered as an alternative payment"
    },
    {
      "code": 6011,
      "name": "alternativePaymentAlreadyRegistered",
      "msg": "Alternative payment already registered for this mint"
    },
    {
      "code": 6012,
      "name": "unauthorized",
      "msg": "Unauthorized: user account does not belong to the payer"
    },
    {
      "code": 6013,
      "name": "invalidParentPost",
      "msg": "Invalid parent post"
    },
    {
      "code": 6014,
      "name": "invalidSignatureInstruction",
      "msg": "Invalid or missing Ed25519 signature verification instruction"
    },
    {
      "code": 6015,
      "name": "sessionExpired",
      "msg": "Session expired or invalid timestamp"
    },
    {
      "code": 6016,
      "name": "unauthorizedSigner",
      "msg": "Unauthorized signer"
    },
    {
      "code": 6017,
      "name": "invalidRelation",
      "msg": "Invalid post relation"
    },
    {
      "code": 6018,
      "name": "answerMustTargetQuestion",
      "msg": "Answer must target a Question post"
    },
    {
      "code": 6019,
      "name": "answerTargetNotRoot",
      "msg": "Answer target must be a Root post"
    },
    {
      "code": 6020,
      "name": "zeroTipAmount",
      "msg": "Zero tip amount not allowed"
    },
    {
      "code": 6021,
      "name": "cannotTipSelf",
      "msg": "Cannot tip yourself"
    },
    {
      "code": 6022,
      "name": "noTipsToClaim",
      "msg": "No tips to claim"
    },
    {
      "code": 6023,
      "name": "zeroAmount",
      "msg": "Zero amount not allowed"
    },
    {
      "code": 6024,
      "name": "cannotSendToSelf",
      "msg": "Cannot send tokens to yourself"
    },
    {
      "code": 6025,
      "name": "tokenNotWithdrawable",
      "msg": "Token is not withdrawable"
    }
  ],
  "types": [
    {
      "name": "tipReceived",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "vaultBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tipsClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
