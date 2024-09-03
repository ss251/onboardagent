import { useAccount } from 'wagmi'
import { useSwitchNetwork } from '@web3modal/ethers/react'
import { polygon } from 'wagmi/chains'
import { useLogin, useProfilesManaged, useSession, useLogout, SessionType } from '@lens-protocol/react-web'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export function LensAuth() {
  const { address } = useAccount()
  const { switchNetwork } = useSwitchNetwork()
  const { execute: login, error: loginError, loading: isLoginPending } = useLogin()
  const { data: session, loading: sessionLoading } = useSession()
  const { execute: logout } = useLogout()

  const { data: profiles, loading: profilesLoading, error: profilesError } = useProfilesManaged({ 
    for: address || '',
    includeOwned: true
  })

  useEffect(() => {
    console.log('Address:', address)
    console.log('Profiles:', profiles)
    console.log('Session:', session)
  }, [address, profiles, session])

  const handleLensLogin = async () => {
    if (!address) return
    try {
      await switchNetwork?.(polygon.id)
      const result = await login({ address })
      if (result.isFailure()) {
        console.error('Login failed:', result.error)
      }
    } catch (error) {
      console.error('Error during login process:', error)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  if (sessionLoading || profilesLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-10 w-10"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (session?.authenticated) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 max-w-2xl mx-auto">
        {/* <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Your Lens Profiles</h2> */}
        {profilesError ? (
          <p className="text-red-600 dark:text-red-400 text-center">Error loading profiles: {profilesError.message}</p>
        ) : profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {profiles.map(profile => (
               <div key={profile.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Image 
                    src={(profile.metadata?.picture as any)?.raw?.uri || (profile.metadata?.picture as any)?.image?.raw?.uri || '/default-avatar.png'} 
                    alt={profile.handle?.fullHandle || 'Profile picture'} 
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{profile.handle?.fullHandle}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center">No Lens profiles found for this wallet.</p>
        )}
        <div className="mt-4 flex justify-start">
          <button 
            onClick={handleLogout} 
            className="bg-red-500 text-white px-12 py-2 rounded-full text-sm hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Log out
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 max-w-2xl mx-auto">
      {/* <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Connect with Lens</h2> */}
      <div className="flex justify-center">
        <button 
          onClick={handleLensLogin} 
          disabled={!address || isLoginPending}
          className="bg-green-500 text-white px-4 py-2 rounded-full text-sm hover:bg-green-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoginPending ? 'Connecting...' : 'Connect with Lens'}
        </button>
      </div>
      {loginError && (
        <p className="mt-4 text-red-500 dark:text-red-400 text-sm text-center">Error logging in: {loginError.message}</p>
      )}
    </div>
  )
}

/*

  if (session?.authenticated) {
    return (
      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-gray-800 dark:to-gray-900 p-8 rounded-xl shadow-2xl max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Your Lens Profiles</h2>
        {profilesLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : profilesError ? (
          <p className="text-red-500 text-center">Error loading profiles: {profilesError.message}</p>
        ) : profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map(profile => (
              <div key={profile.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Image 
                    src={(profile.metadata?.picture as any)?.raw?.uri || (profile.metadata?.picture as any)?.image?.raw?.uri || '/default-avatar.png'} 
                    alt={profile.handle?.fullHandle || 'Profile picture'} 
                    layout="fill"
                    objectFit="cover"
                    className="rounded-full"
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-xl text-purple-700 dark:text-purple-300 mb-2">{profile.handle?.fullHandle}</p>
                  {profile.metadata?.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 hover:line-clamp-none transition-all duration-300">{profile.metadata.bio}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center text-lg">No Lens profiles found for this wallet.</p>
        )}
        <div className="mt-12 text-center">
        <button 
          onClick={handleLogout} 
          className="mt-8 bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Log out
        </button>
        </div>
      </div>
    )
  }
export function LensAuth() {
  ...
  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-gray-800 dark:to-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center">
        <h2 className="text-3xl font-bold mb-6 text-purple-800 dark:text-purple-300">Connect with Lens</h2>
        <button 
          onClick={handleLensLogin} 
          disabled={!address || isLoginPending}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoginPending ? 'Connecting...' : 'Log in with Wallet'}
        </button>
        */