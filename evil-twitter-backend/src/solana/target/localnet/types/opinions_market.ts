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
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "userPostMintClaim",
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
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "userAccount",
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
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
      "name": "deposit",
      "docs": [
        "User deposits from their wallet into the program-controlled vault."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
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
          "name": "tokenMint"
        },
        {
          "name": "validPayment",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "userTokenAta",
          "writable": true
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
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
              }
            ]
          }
        },
        {
          "name": "userVaultTokenAccount",
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
                  118,
                  97,
                  117,
                  108,
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
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
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
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "distributeCreatorReward",
      "docs": [
        "Distribute creator reward from frozen settlement.",
        "Reads creator_fee from PostMintPayout and transfers it to creator's vault."
      ],
      "discriminator": [
        236,
        163,
        223,
        55,
        91,
        109,
        80,
        119
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
          "name": "creatorVaultTokenAccount",
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
                  118,
                  97,
                  117,
                  108,
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
                "path": "post.creator_user",
                "account": "postAccount"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
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
              }
            ]
          }
        },
        {
          "name": "tokenMint"
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
          "name": "parentPost",
          "optional": true
        },
        {
          "name": "parentPostPotTokenAccount",
          "optional": true
        },
        {
          "name": "parentPostPotAuthority",
          "optional": true
        },
        {
          "name": "tokenMint"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
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
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "config"
        },
        {
          "name": "tokenMint"
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
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
          "name": "blingMint"
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "validPayment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "blingMint"
              }
            ]
          }
        },
        {
          "name": "protocolBlingTreasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
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
                "path": "blingMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
    },
    {
      "name": "registerValidPayment",
      "discriminator": [
        17,
        178,
        199,
        191,
        236,
        133,
        165,
        187
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenMint"
        },
        {
          "name": "validPayment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
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
          "docs": [
            "NEW treasury token account for this mint, canonical PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
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
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "priceInBling",
          "type": "u64"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
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
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "parentPost",
          "optional": true
        },
        {
          "name": "parentPostPotTokenAccount",
          "writable": true,
          "optional": true,
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
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "config"
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
      "docs": [
        "Core MVP voting instruction.",
        "User pays from their vault; everything is denominated in BLING."
      ],
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
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
                "path": "voter"
              },
              {
                "kind": "account",
                "path": "sessionKey"
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
          "name": "voterUserAccount",
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
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "voterUserVaultTokenAccount",
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
                  118,
                  97,
                  117,
                  108,
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
                "path": "voter"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
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
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
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
          "name": "protocolTokenTreasuryTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121,
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
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "creatorVaultTokenAccount",
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
                  118,
                  97,
                  117,
                  108,
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
                "path": "post.creator_user",
                "account": "postAccount"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "validPayment",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  95,
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
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
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw with possible penalty based on social interactions.",
        "You can later implement:",
        "effective_amount = amount * (10000 - user.withdraw_penalty_bps()) / 10000"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
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
          "name": "tokenMint"
        },
        {
          "name": "userTokenDestAta",
          "writable": true
        },
        {
          "name": "userVaultTokenAccount",
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
                  118,
                  97,
                  117,
                  108,
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
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ]
          }
        },
        {
          "name": "vaultAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
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
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
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
    },
    {
      "name": "userPostMintClaim",
      "discriminator": [
        19,
        128,
        179,
        146,
        169,
        152,
        97,
        40
      ]
    },
    {
      "name": "userPostPosition",
      "discriminator": [
        204,
        98,
        26,
        158,
        0,
        30,
        228,
        130
      ]
    },
    {
      "name": "validPayment",
      "discriminator": [
        56,
        136,
        160,
        63,
        231,
        218,
        212,
        50
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
    }
  ],
  "types": [
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "payerAuthroity",
            "type": "pubkey"
          },
          {
            "name": "blingMint",
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
            "docs": [
              "10_000 by default"
            ],
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
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userPostMintClaim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
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
      "name": "userPostPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
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
    },
    {
      "name": "validPayment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tokenMint",
            "type": "pubkey"
          },
          {
            "name": "priceInBling",
            "docs": [
              "how much is 1 token in BLING votes -",
              "1 USDC = 10_000 BLING for example",
              "1 SOL = 1_000_000_000 BLING for example",
              "This value is lamport-free. So 1 BLING = 1 BLING"
            ],
            "type": "u64"
          },
          {
            "name": "enabled",
            "type": "bool"
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
