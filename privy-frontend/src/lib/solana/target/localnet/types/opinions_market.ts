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
      "name": "claimPostReward",
      "discriminator": [
        225,
        10,
        87,
        162,
        180,
        99,
        63,
        32
      ],
      "accounts": [
        {
          "name": "omConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
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
          "name": "sessionKey",
          "writable": true
        },
        {
          "name": "sessionAuthority"
        },
        {
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "voterPostMintClaim",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  114,
                  95,
                  112,
                  111,
                  115,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postMintPayout",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  112,
                  97,
                  121,
                  111,
                  117,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postPotTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
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
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postPotAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
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
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "userVaultTokenAccount",
          "writable": true
        },
        {
          "name": "vaultAuthority"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "fedProgram",
          "address": "GLQEgZvtw6JdtF4p1cGsDBh3ucCVrmpZjPuyzqp6yMTo"
        },
        {
          "name": "personaProgram",
          "address": "3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createAnswer",
      "discriminator": [
        40,
        0,
        255,
        68,
        75,
        97,
        185,
        35
      ],
      "accounts": [
        {
          "name": "omConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "sessionKey",
          "writable": true
        },
        {
          "name": "sessionAuthority"
        },
        {
          "name": "userAccount"
        },
        {
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "answerPostIdHash"
              }
            ]
          }
        },
        {
          "name": "questionPost",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "questionPostIdHash"
              }
            ]
          }
        },
        {
          "name": "personaProgram",
          "address": "3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "answerPostIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "questionPostIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "createPost",
      "discriminator": [
        123,
        92,
        184,
        29,
        231,
        24,
        15,
        202
      ],
      "accounts": [
        {
          "name": "omConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "sessionKey",
          "writable": true
        },
        {
          "name": "sessionAuthority"
        },
        {
          "name": "userAccount"
        },
        {
          "name": "voterAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
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
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "personaProgram",
          "address": "3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "parentPostPda",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "createQuestion",
      "docs": [
        "Core MVP voting instruction.",
        "User pays from their vault; everything is denominated in BLING."
      ],
      "discriminator": [
        222,
        74,
        49,
        30,
        160,
        220,
        179,
        27
      ],
      "accounts": [
        {
          "name": "omConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "sessionKey",
          "writable": true
        },
        {
          "name": "sessionAuthority"
        },
        {
          "name": "userAccount"
        },
        {
          "name": "voterAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
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
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "personaProgram",
          "address": "3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "distributeParentPostShare",
      "docs": [
        "Distribute parent post share from frozen settlement.",
        "Reads mother_fee from PostMintPayout and transfers it to parent post's pot."
      ],
      "discriminator": [
        116,
        113,
        172,
        154,
        248,
        40,
        239,
        114
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "post",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "postPotTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
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
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postPotAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
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
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "postMintPayout",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  112,
                  97,
                  121,
                  111,
                  117,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "parentPost"
        },
        {
          "name": "parentPostPotTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
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
                "path": "parentPost"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "parentPostPotAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
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
                "path": "parentPost"
              }
            ]
          }
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "fedProgram",
          "address": "GLQEgZvtw6JdtF4p1cGsDBh3ucCVrmpZjPuyzqp6yMTo"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "distributeProtocolFee",
      "docs": [
        "Distribute creator reward from frozen settlement.",
        "Reads creator_fee from PostMintPayout and transfers it to creator's vault.",
        "Distribute protocol fee from frozen settlement.",
        "Reads protocol_fee from PostMintPayout and transfers it to protocol treasury."
      ],
      "discriminator": [
        212,
        187,
        180,
        191,
        59,
        44,
        108,
        105
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "post",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "postPotTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
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
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postPotAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
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
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "postMintPayout",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  112,
                  97,
                  121,
                  111,
                  117,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "protocolTokenTreasuryTokenAccount",
          "writable": true
        },
        {
          "name": "validPayment"
        },
        {
          "name": "fedConfig"
        },
        {
          "name": "omConfig"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "fedProgram",
          "address": "GLQEgZvtw6JdtF4p1cGsDBh3ucCVrmpZjPuyzqp6yMTo"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "omConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "baseDurationSecs",
          "type": "u32"
        },
        {
          "name": "maxDurationSecs",
          "type": "u32"
        },
        {
          "name": "extensionPerVoteSecs",
          "type": "u32"
        }
      ]
    },
    {
      "name": "settlePost",
      "discriminator": [
        233,
        212,
        182,
        235,
        96,
        1,
        195,
        71
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "postPotTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
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
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postPotAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
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
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "postMintPayout",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116,
                  95,
                  112,
                  97,
                  121,
                  111,
                  117,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "protocolTokenTreasuryTokenAccount",
          "writable": true
        },
        {
          "name": "parentPost",
          "optional": true
        },
        {
          "name": "omConfig"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "voteOnPost",
      "discriminator": [
        220,
        160,
        255,
        192,
        61,
        83,
        169,
        65
      ],
      "accounts": [
        {
          "name": "omConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  109,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "voter",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionKey",
          "writable": true
        },
        {
          "name": "sessionAuthority"
        },
        {
          "name": "post",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
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
                "kind": "arg",
                "path": "postIdHash"
              }
            ]
          }
        },
        {
          "name": "userAccount"
        },
        {
          "name": "voterAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
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
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "voterUserVaultTokenAccount",
          "docs": [
            "- keep opague so Fed TokenAccount cpi will initialize it and we won't be stopped by TokenAccount here"
          ],
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "post"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority"
        },
        {
          "name": "postPotTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
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
                "path": "post"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "postPotAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  116,
                  95,
                  112,
                  111,
                  116,
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
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "protocolTokenTreasuryTokenAccount",
          "writable": true
        },
        {
          "name": "creatorVaultTokenAccount",
          "writable": true
        },
        {
          "name": "creatorUser",
          "docs": [
            "This is the creator of the post, used to derive the creator vault PDA",
            "Marked as mut because Fed CPI requires it for init_if_needed on creator vault"
          ],
          "writable": true
        },
        {
          "name": "validPayment"
        },
        {
          "name": "fedConfig"
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "fedProgram",
          "address": "GLQEgZvtw6JdtF4p1cGsDBh3ucCVrmpZjPuyzqp6yMTo"
        },
        {
          "name": "personaProgram",
          "address": "3bE1UxZ4VFKbptUhpFwzA1AdXgdJENhRcLQApj9F9Z1d"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": {
              "name": "side"
            }
          }
        },
        {
          "name": "votes",
          "type": "u64"
        },
        {
          "name": "postIdHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "omConfig",
      "discriminator": [
        154,
        198,
        113,
        25,
        205,
        249,
        252,
        7
      ]
    },
    {
      "name": "postAccount",
      "discriminator": [
        85,
        236,
        139,
        84,
        240,
        243,
        196,
        23
      ]
    },
    {
      "name": "postMintPayout",
      "discriminator": [
        109,
        227,
        8,
        126,
        195,
        153,
        18,
        167
      ]
    },
    {
      "name": "voterAccount",
      "discriminator": [
        24,
        202,
        161,
        124,
        196,
        184,
        105,
        236
      ]
    },
    {
      "name": "voterPostMintClaim",
      "discriminator": [
        182,
        240,
        212,
        164,
        172,
        232,
        10,
        248
      ]
    },
    {
      "name": "voterPostPosition",
      "discriminator": [
        23,
        22,
        75,
        28,
        141,
        220,
        143,
        192
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
      "name": "forcedOutcome",
      "docs": [
        "Forced settlement outcome for Answers"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pump"
          },
          {
            "name": "smack"
          }
        ]
      }
    },
    {
      "name": "omConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "baseDurationSecs",
            "type": "u32"
          },
          {
            "name": "maxDurationSecs",
            "type": "u32"
          },
          {
            "name": "extensionPerVoteSecs",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          }
        ]
      }
    },
    {
      "name": "postAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "function",
            "type": {
              "defined": {
                "name": "postFunction"
              }
            }
          },
          {
            "name": "relation",
            "type": {
              "defined": {
                "name": "postRelation"
              }
            }
          },
          {
            "name": "forcedOutcome",
            "type": {
              "option": {
                "defined": {
                  "name": "forcedOutcome"
                }
              }
            }
          },
          {
            "name": "creatorUser",
            "type": "pubkey"
          },
          {
            "name": "postIdHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "postState"
              }
            }
          },
          {
            "name": "winningSide",
            "type": {
              "option": {
                "defined": {
                  "name": "side"
                }
              }
            }
          },
          {
            "name": "upvotes",
            "type": "u64"
          },
          {
            "name": "downvotes",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "padding to prevent future breakage"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "postFunction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "normal"
          },
          {
            "name": "question"
          },
          {
            "name": "answer"
          }
        ]
      }
    },
    {
      "name": "postMintPayout",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "initialPot",
            "type": "u64"
          },
          {
            "name": "totalPayout",
            "type": "u64"
          },
          {
            "name": "payoutPerWinningVote",
            "type": "u64"
          },
          {
            "name": "creatorFee",
            "type": "u64"
          },
          {
            "name": "protocolFee",
            "type": "u64"
          },
          {
            "name": "motherFee",
            "type": "u64"
          },
          {
            "name": "frozen",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "postRelation",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "root"
          },
          {
            "name": "reply",
            "fields": [
              {
                "name": "parent",
                "type": "pubkey"
              }
            ]
          },
          {
            "name": "quote",
            "fields": [
              {
                "name": "quoted",
                "type": "pubkey"
              }
            ]
          },
          {
            "name": "answerTo",
            "fields": [
              {
                "name": "question",
                "type": "pubkey"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "postState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "settled"
          }
        ]
      }
    },
    {
      "name": "side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pump"
          },
          {
            "name": "smack"
          }
        ]
      }
    },
    {
      "name": "voterAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "socialScore",
            "type": "i64"
          },
          {
            "name": "attackSurface",
            "type": {
              "defined": {
                "name": "voterAccountAttackSurface"
              }
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
      "name": "voterAccountAttackSurface",
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
      "name": "voterPostMintClaim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voterPostPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "upvotes",
            "type": "u64"
          },
          {
            "name": "downvotes",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
