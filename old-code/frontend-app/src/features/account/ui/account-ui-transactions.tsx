import { Address } from 'gill'
import { RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ellipsify } from '@/lib/utils'
import { Button, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Box, Typography, CircularProgress, Alert } from '@mui/material'
import { AppExplorerLink } from '@/components/app-explorer-link'
import { useGetSignaturesQuery } from '../data-access/use-get-signatures-query'

export function AccountUiTransactions({ address }: { address: Address }) {
  const query = useGetSignaturesQuery({ address })
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          Transaction History
        </Typography>
        <Box>
          {query.isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Button variant="outlined" onClick={() => query.refetch()} startIcon={<RefreshCw size={16} />}>
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
            <Typography>No transactions found.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Signature</TableCell>
                    <TableCell align="right">Slot</TableCell>
                    <TableCell>Block Time</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items?.map((item) => (
                    <TableRow key={item.signature}>
                      <TableCell>
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                          <AppExplorerLink transaction={item.signature} label={ellipsify(item.signature, 8)} />
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>
                          <AppExplorerLink block={item.slot.toString()} label={item.slot.toString()} />
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(Number(item.blockTime ?? '0') * 1000).toISOString()}</TableCell>
                      <TableCell align="right">
                        <Typography
                          component="span"
                          color={item.err ? 'error.main' : 'success.main'}
                        >
                          {item.err ? 'Failed' : 'Success'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(query.data?.length ?? 0) > 5 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
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
