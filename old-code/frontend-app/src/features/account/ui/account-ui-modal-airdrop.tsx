import { Address } from 'gill'
import { useState } from 'react'
import { AppModal } from '@/components/app-modal'
import { TextField } from '@mui/material'
import { useRequestAirdropMutation } from '../data-access/use-request-airdrop-mutation'

export function AccountUiModalAirdrop({ address }: { address: Address }) {
  const mutation = useRequestAirdropMutation({ address })
  const [amount, setAmount] = useState('2')

  return (
    <AppModal
      title="Airdrop"
      submitDisabled={!amount || mutation.isPending}
      submitLabel="Request Airdrop"
      submit={() => mutation.mutateAsync(parseFloat(amount))}
    >
      <TextField
        label="Amount"
        disabled={mutation.isPending}
        id="amount"
        inputProps={{ min: '1', step: 'any' }}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        type="number"
        value={amount}
        fullWidth
      />
    </AppModal>
  )
}
