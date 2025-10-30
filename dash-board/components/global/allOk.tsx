'use client'
import { apiEndpoints } from '@/config'
import React, { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import axios from 'axios'
import { Spinner } from '@/components/ui/spinner'
import { camelToWords } from '@/lib/utils'

interface PingResult {
  url: string
  status: 'online' | 'offline' | 'loading'
  latency: number | null
}

function AllOk() {
  // Initialize state with ping URLs from config
  const getPingUrls = () => {
    const pingUrls: string[] = []
    Object.values(apiEndpoints).forEach((endpoint: Record<string, string>) => {
      pingUrls.push(endpoint.ping)
    })
    return pingUrls.map((url) => ({
      url,
      status: 'loading' as const,
      latency: null,
    }))
  }

  const [pingResults, setPingResults] = useState<PingResult[]>(getPingUrls())

  useEffect(() => {
    // Make concurrent requests
    const pingAllUrls = async () => {
      const pingUrls: string[] = []
      Object.values(apiEndpoints).forEach((endpoint: Record<string, string>) => {
        pingUrls.push(endpoint.ping)
      })
      
      const requests = pingUrls.map(async (url) => {
        const startTime = performance.now()
        try {
          const response = await axios.get(url)
          const endTime = performance.now()
          const latency = endTime - startTime

          return {
            url,
            status: response.status === 200 ? 'online' : 'offline',
            latency,
          } as PingResult
        } catch (error) {
          console.error(`Failed to ping ${url}:`, error)
          return {
            url,
            status: 'offline',
            latency: null,
          } as PingResult
        }
      })

      // Wait for all requests to complete concurrently
      const results = await Promise.all(requests)
      setPingResults(results)
    }

    pingAllUrls()
  }, [])

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Latency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pingResults.map((result, i) => {
            return (
              <TableRow key={i}>
              <TableCell>
                {camelToWords(Object.keys(apiEndpoints).find((key) => apiEndpoints[key].ping === result.url) ?? "Unknown")}
              </TableCell>
              <TableCell className='font-mono text-sm'>{result.url.split("/")[2]}</TableCell>
              <TableCell>
                {result.status === 'loading' ? (
                  <Spinner />
                ) : (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      result.status === 'online'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {result.status}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {result.status === 'loading' ? (
                  <span className='text-muted-foreground'>-</span>
                ) : result.latency !== null ? (
                  <span className='font-medium'>{result.latency.toFixed(0)}ms</span>
                ) : (
                  <span className='text-muted-foreground'>-</span>
                )}
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default AllOk