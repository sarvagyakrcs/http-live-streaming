import AllOk from "@/components/global/allok"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"

const HomePage = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <AllOk />
        <Link href="/upload" className={buttonVariants({ variant: "default" })}>
          Upload
        </Link>
      </div>
    </div>
  )
}

export default HomePage