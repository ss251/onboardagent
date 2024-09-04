import { useAccount } from 'wagmi'
import { useWeb3ModalAccount, useWeb3ModalProvider, useSwitchNetwork } from '@web3modal/ethers/react'
import { polygon } from 'wagmi/chains'
import { useLogin, useProfilesManaged, useSession, useLogout, ProfileId, ProfileSession } from '@lens-protocol/react-web'
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

  const handleLensLogin = async (profileId: string) => {
    if (!address) return
    try {
      const result = await login({ 
        address, 
        profileId: profileId as ProfileId
      })
      console.log(result)
      if (result.isSuccess()) {
        console.log('Login successful')
      } else {
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
    if ('profile' in session) {
      const loggedInProfile = session.profile;
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 max-w-2xl mx-auto">
          <div className="flex items-center space-x-6">
            <div className="relative w-20 h-20">
              <Image 
                src={(loggedInProfile?.metadata?.picture as any)?.raw?.uri || (loggedInProfile?.metadata?.picture as any)?.image?.raw?.uri || '/default-avatar.png'} 
                alt={loggedInProfile?.handle?.fullHandle || 'Profile picture'} 
                layout="fill"
                objectFit="cover"
                className="rounded-full"
              />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">{loggedInProfile?.handle?.fullHandle}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Logged in successfully</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleLogout} 
              className="bg-red-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Log out
            </button>
          </div>
        </div>
      )
    } else {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 max-w-2xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400 text-center text-lg">Authenticated, but no profile selected.</p>
          <div className="mt-6 flex justify-center">
            <button 
              onClick={handleLogout} 
              className="bg-red-500 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Log out
            </button>
          </div>
        </div>
      )
    }
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 dark:text-gray-200">Select a profile to login</h2>
      {profiles && profiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          {profiles.map(profile => (
            <button 
              key={profile.id}
              onClick={() => handleLensLogin(profile.id)}
              disabled={isLoginPending}
              className="bg-white dark:bg-gray-700 p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="relative w-20 h-20 mx-auto mb-4">
                <Image 
                  src={(profile.metadata?.picture as any)?.raw?.uri || (profile.metadata?.picture as any)?.image?.raw?.uri || '/default-avatar.png'} 
                  alt={profile.handle?.fullHandle || 'Profile picture'} 
                  layout="fill"
                  objectFit="cover"
                  className="rounded-full"
                />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{profile.handle?.fullHandle}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 text-center text-lg">No Lens profiles found for this wallet.</p>
      )}
      {loginError && (
        <p className="mt-6 text-red-500 dark:text-red-400 text-sm text-center">{loginError.message}</p>
      )}
    </div>
  )
}
