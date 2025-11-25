import { Address } from 'gill'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Box, Typography, CircularProgress, Alert } from '@mui/material'
import { ellipsify } from '@/lib/utils'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { useGetTokenAccountsQuery } from '../data-access/use-get-token-accounts-query'

export function AccountUiTokens({ address }: { address: Address }) {
  const [showAll, setShowAll] = useState(false)
  const query = useGetTokenAccountsQuery({ address })
  const client = useQueryClient()
  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          Token Accounts
        </Typography>
        <Box>
          {query.isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Button
              variant="outlined"
              onClick={async () => {
                await query.refetch()
                await client.invalidateQueries({
                  queryKey: ['getTokenAccountBalance'],
                })
              }}
              startIcon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
          )}
        </Box>
      </Box>
      {query.isError && (
        <Alert severity="error">Error: {query.error?.message.toString()}</Alert>
      )}
      {query.isSuccess && (
        <Box>
          {query.data.length === 0 ? (
            <Typography>No token accounts found.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Public Key</TableCell>
                    <TableCell>Mint</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items?.map(({ account, pubkey }) => (
                    <TableRow key={pubkey.toString()}>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                            <AppExplorerLink label={ellipsify(pubkey.toString())} address={pubkey.toString()} />
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                            <AppExplorerLink
                              label={ellipsify(account.data.parsed.info.mint)}
                              address={account.data.parsed.info.mint.toString()}
                            />
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                          {account.data.parsed.info.tokenAmount.uiAmount}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                  {(query.data?.length ?? 0) > 5 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Button variant="outlined" onClick={() => setShowAll(!showAll)}>
                          {showAll ? 'Show Less' : 'Show All'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  )
}
