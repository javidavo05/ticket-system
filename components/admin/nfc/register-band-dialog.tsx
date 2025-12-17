'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/modal'
import { RegisterBandForm } from './register-band-form'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export function RegisterBandDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Pulsera
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Nueva Pulsera NFC</DialogTitle>
        </DialogHeader>
        <RegisterBandForm onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
