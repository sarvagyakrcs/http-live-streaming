'use server'
import { getRootDirectories } from '@/lib/r2-client'
import Link from 'next/link'

const HomePage = async () => {
    const directories = await getRootDirectories()
  return (
    <div className='flex flex-col gap-4'>
        {directories.map((directory) => (
            <Link key={directory} href={`/play/${directory}`} className='text-blue-500 hover:text-blue-600'>{directory}</Link>
        ))}
    </div>
  );
};

export default HomePage;