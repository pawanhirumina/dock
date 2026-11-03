import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="flex w-full h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm rounded-none">
        <CardHeader className="flex items-center flex-col">
          <CardTitle className="text-center text-3xl font-bold">404</CardTitle>
          <CardDescription>
            Page not found
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pt-6 rounded-none">
          <Button asChild size="sm" className=" rounded-none">
            <Link href="/admin">
              Back to dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
