import AllOk from "@/components/global/allOk"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"

const HomePage = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <AllOk />
        <div className="flex items-center justify-center gap-4">
          <Link href="/upload" className={buttonVariants({ variant: "default" })}>
            Upload
          </Link>
          <Link href="/bucket" className={buttonVariants({ variant: "outline" })}>
            Bucket Manager
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HomePage