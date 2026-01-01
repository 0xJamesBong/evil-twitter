/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/persona.json`.
 */
export type Persona = {
  "address": "3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d",
  "metadata": {
    "name": "persona",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "checkSessionOrWallet",
      "discriminator": [
        140,
        122,
        30,
        153,
        173,
        31,
        162,
        104
      ],
      "accounts": [
        {
          "name": "user"
        },
        {
          "name": "sessionKey"
        },
        {
          "name": "sessionAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "sessionKey"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "now",
          "type": "i64"
        }
      ]
    },
    {
      "name": "createUser",
      "discriminator": [
        108,
        227,
        130,
        130,
        252,
        109,
        75,
        218
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerSession",
      "discriminator": [
        101,
        116,
        106,
        43,
        152,
        189,
        4,
        110
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "user"
        },
        {
          "name": "sessionKey"
        },
        {
          "name": "sessionAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "sessionKey"
              }
            ]
          }
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "expectedIndex",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "sessionAuthority",
      "discriminator": [
        48,
        9,
        30,
        120,
        134,
        35,
        172,
        170
      ]
    },
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
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
      "name": "health",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "surface1",
            "type": "i16"
          },
          {
            "name": "surface2",
            "type": "i16"
          },
          {
            "name": "surface3",
            "type": "i16"
          },
          {
            "name": "surface4",
            "type": "i16"
          },
          {
            "name": "surface5",
            "type": "i16"
          },
          {
            "name": "surface6",
            "type": "i16"
          },
          {
            "name": "surface7",
            "type": "i16"
          },
          {
            "name": "surface8",
            "type": "i16"
          },
          {
            "name": "surface9",
            "type": "i16"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                31
              ]
            }
          }
        ]
      }
    },
    {
      "name": "sessionAuthority",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "sessionKey",
            "type": "pubkey"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "privilegesHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "socialScore",
            "type": "i64"
          },
          {
            "name": "health",
            "type": {
              "defined": {
                "name": "health"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
