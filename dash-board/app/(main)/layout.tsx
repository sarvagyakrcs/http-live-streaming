import { buttonVariants } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

type Props = {
    children: React.ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <div className='h-screen w-screen flex items-center justify-center'>
      <nav className='absolute w-full h-16 top-0 left-0 flex justify-between items-center px-12 bg-white/10 dark:bg-black/10 backdrop-blur-md border-b border-white/20 dark:border-white/10'>
        <Link href="/">
          <Image src="/logo.svg" alt="logo" width={50} height={50} />
        </Link>
        <div className='flex items-center gap-4'>
          <Link href="/upload" className={buttonVariants({ variant: "default" })}>
            Upload
          </Link>
          <Link href="/bucket" className={buttonVariants({ variant: "outline" })}>
            Bucket Manager
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}

export default Layout