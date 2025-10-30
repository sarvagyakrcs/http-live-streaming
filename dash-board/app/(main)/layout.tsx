import { buttonVariants } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

type Props = {
    children: React.ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <div className='h-screen w-screen flex flex-col overflow-hidden'>
      <nav className='shrink-0 w-full h-16 flex justify-between items-center px-12 bg-white/10 dark:bg-black/10 backdrop-blur-md border-b border-white/20 dark:border-white/10 z-50'>
        <Link href="/">
          <Image src="/logo.svg" alt="logo" width={50} height={50} />
        </Link>
        <div className='flex items-center gap-4'>
          <Link href="/upload" className={buttonVariants({ variant: "default" })}>
            Upload
          </Link>
          <Link href="/bucket" className={buttonVariants({ variant: "secondary" })}>
            Bucket Manager
          </Link>
          <Link href="/status" className={buttonVariants({ variant: "outline" })}>
            Status
          </Link>
        </div>
      </nav>
      <div className='flex-1 overflow-hidden'>
        {children}
      </div>
    </div>
  )
}

export default Layout