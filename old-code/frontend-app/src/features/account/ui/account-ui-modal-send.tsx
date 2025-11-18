import { address, Address } from 'gill'
import { useState } from 'react'
import { UiWalletAccount } from '@wallet-ui/react'
import { AppModal } from '@/components/app-modal'
import { TextField } from '@mui/material'
import { useTransferSolMutation } from '../data-access/use-transfer-sol-mutation'

export function AccountUiModalSend(props: { account: UiWalletAccount; address: Address }) {
  const mutation = useTransferSolMutation({ account: props.account, address: props.address })
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('1')

  if (!props.address) {
    return <div>Wallet not connected</div>
  }

  return (
    <AppModal
      title="Send"
      submitDisabled={!destination || !amount || mutation.isPending}
      submitLabel="Send"
      submit={async () => {
        await mutation.mutateAsync({
          destination: address(destination),
          amount: parseFloat(amount),
        })
      }}
    >
      <TextField
        label="Destination"
        disabled={mutation.isPending}
        id="destination"
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination"
        type="text"
        value={destination}
        fullWidth
      />
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
