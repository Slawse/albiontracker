import { useEffect, useState } from 'react'
import '../../styles/meta/weaponMeta.css'
import { getHomeWeaponMeta } from '../../api/albionApi'
import WeaponDetailPanel from '../../components/meta/WeaponDetailPanel'

export default function WeaponMeta({ weaponBaseId, onBack }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!weaponBaseId) return

    let cancelled = false

    async function loadWeapon() {
      setLoading(true)
      setDetail(null)

      try {
        const data = await getHomeWeaponMeta(weaponBaseId)

        if (!cancelled) {
          setDetail(data)
        }
      } catch (error) {
        console.warn('Detail arme indisponible:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadWeapon()

    return () => {
      cancelled = true
    }
  }, [weaponBaseId])

  return (
    <main className="weaponMetaPage">
      <WeaponDetailPanel detail={detail} loading={loading} onBack={onBack} />
    </main>
  )
}
