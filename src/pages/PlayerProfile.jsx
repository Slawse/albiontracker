import { useEffect, useMemo, useState } from 'react'
import '../styles/tracker.css'
import { getItemImage, cleanItemName } from '../utils/items'

const FIGHTS_PER_PAGE = 10
const API_URL = 'http://localhost:3001'

const GEAR_ORDER = [
  { key: 'bag', label: 'Sac' },
  { key: 'head', label: 'Tête' },
  { key: 'cape', label: 'Cape' },

  { key: 'mainHand', label: 'Main principale' },
  { key: 'armor', label: 'Armure' },
  { key: 'offHand', label: 'Main secondaire' },

  { key: 'potion', label: 'Potion' },
  { key: 'shoes', label: 'Chaussures' },
  { key: 'food', label: 'Nourriture' },

  { key: '__empty_left_mount', label: '', empty: true },
  { key: 'mount', label: 'Monture' },
  { key: '__empty_right_mount', label: '', empty: true },
]

function getItemType(item) {
  return typeof item === 'string' ? item : item?.type || ''
}

function getItemQuality(item) {
  return typeof item === 'string' ? 1 : Number(item?.quality || 1)
}

function getItemCount(item) {
  return typeof item === 'string' ? 1 : Number(item?.count || 1)
}

function getQualityLabel(quality) {
  const labels = {
    1: 'Normal',
    2: 'Bon',
    3: 'Remarquable',
    4: 'Excellent',
    5: 'Formidable',
  }

  return labels[quality] || 'Normal'
}

function getQualityClass(item) {
  return `quality-${getItemQuality(item)}`
}

function formatSilver(value) {
  if (!value) return 'Prix indisponible'

  return `${Number(value).toLocaleString('fr-FR')} silver`
}

function formatShortSilver(value) {
  if (!value) return 'Indisponible'

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`
  }

  return `${Number(value).toLocaleString('fr-FR')}`
}

function formatSilverBalance(value) {
  if (!Number.isFinite(value)) return '-'
  if (value === 0) return '0'

  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${formatShortSilver(Math.abs(value))}`
}

function parseItemInfo(item = '') {
  const id = getItemType(item)
  const quality = getItemQuality(item)
  const count = getItemCount(item)

  const tierMatch = id.match(/^T(\d+)/i)
  const enchantMatch = id.match(/@(\d+)/)

  const tier = tierMatch ? tierMatch[1] : '—'
  const enchant = enchantMatch ? enchantMatch[1] : '0'

  let type = 'Item'

  if (id.includes('_2H_') || id.includes('MAIN_')) type = 'Arme'
  if (id.includes('HEAD_')) type = 'Casque'
  if (id.includes('ARMOR_')) type = 'Armure'
  if (id.includes('SHOES_')) type = 'Bottes'
  if (id.includes('CAPE')) type = 'Cape'
  if (id.includes('BAG')) type = 'Sac'
  if (id.includes('MOUNT')) type = 'Monture'
  if (id.includes('POTION')) type = 'Potion'
  if (id.includes('MEAL') || id.includes('FOOD')) type = 'Nourriture'

  return {
    id,
    name: cleanItemName(id),
    tier,
    enchant,
    type,
    quality,
    qualityLabel: getQualityLabel(quality),
    count,
    image: getItemImage(id),
  }
}

function getGearItems(gear = {}) {
  const items = []

  GEAR_ORDER
    .filter((slot) => !slot.empty)
    .forEach((slot) => {
      const item = gear?.[slot.key]
      if (!item) return

      const itemType = getItemType(item)

      if (
        slot.key === 'offHand' &&
        gear.mainHand &&
        getItemType(gear.mainHand) === itemType
      ) {
        return
      }

      items.push(item)
    })

  return items
}

function aggregateItems(items = []) {
  const grouped = new Map()

  items.forEach((item) => {
    const type = getItemType(item)
    if (!type) return

    const quality = getItemQuality(item)
    const count = getItemCount(item)
    const key = `${type}:${quality}`
    const existing = grouped.get(key)

    if (existing) {
      existing.count += count
    } else {
      grouped.set(key, { type, quality, count })
    }
  })

  return Array.from(grouped.values())
}

function getEstimatedLootItems(fight = {}) {
  const gearItems = getGearItems(fight.victimGear || {})
  const inventoryItems = Array.isArray(fight.victimBag) ? fight.victimBag : []

  return aggregateItems([...gearItems, ...inventoryItems])
}

function isFightToday(fight = {}) {
  if (!fight.rawDate) return false

  const fightDate = new Date(fight.rawDate)
  const now = new Date()

  return (
    fightDate.getFullYear() === now.getFullYear() &&
    fightDate.getMonth() === now.getMonth() &&
    fightDate.getDate() === now.getDate()
  )
}

function getDayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDayLabel(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function getDailySilverItems(fights = []) {
  const todayFights = fights.filter(isFightToday)
  const gainedItems = []
  const lostItems = []

  todayFights.forEach((fight) => {
    const items = getEstimatedLootItems(fight)

    if (fight.type === 'kill') {
      gainedItems.push(...items)
    }

    if (fight.type === 'death') {
      lostItems.push(...items)
    }
  })

  return {
    fights: todayFights,
    gainedItems: aggregateItems(gainedItems),
    lostItems: aggregateItems(lostItems),
  }
}

function getSilverBucketsByDay(fights = [], dayCount = 10) {
  const today = new Date()
  const buckets = []
  const bucketMap = new Map()

  for (let index = dayCount - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - index)

    const key = getDayKey(date)
    const bucket = {
      key,
      label: getDayLabel(date),
      date,
      fights: [],
      gainedItems: [],
      lostItems: [],
      kills: 0,
      deaths: 0,
    }

    buckets.push(bucket)
    bucketMap.set(key, bucket)
  }

  fights.forEach((fight) => {
    if (!fight.rawDate) return

    const fightDate = new Date(fight.rawDate)
    const bucket = bucketMap.get(getDayKey(fightDate))
    if (!bucket) return

    const items = getEstimatedLootItems(fight)

    bucket.fights.push(fight)

    if (fight.type === 'kill') {
      bucket.kills += 1
      bucket.gainedItems.push(...items)
    }

    if (fight.type === 'death') {
      bucket.deaths += 1
      bucket.lostItems.push(...items)
    }
  })

  return buckets.map((bucket) => ({
    ...bucket,
    gainedItems: aggregateItems(bucket.gainedItems),
    lostItems: aggregateItems(bucket.lostItems),
  }))
}

async function fetchItemPrice(item) {
  try {
    const itemType = getItemType(item)
    const quality = getItemQuality(item)

    if (!itemType) return null

    const res = await fetch(
      `${API_URL}/item-price/${encodeURIComponent(itemType)}?quality=${quality}`
    )

    if (!res.ok) return null

    const data = await res.json()
    const bestPrice = data?.bestPrice

    if (!bestPrice?.price) return null

    return {
      price: Number(bestPrice.price),
      city: bestPrice.city || '',
      fallback: data?.fallback || false,
      usedItemId: data?.usedItemId || itemType,
      usedQuality: data?.usedQuality || quality,
    }
  } catch (error) {
    console.warn('Erreur prix item:', item, error)
    return null
  }
}

function GearValue({ gear = {} }) {
  const [totalPrice, setTotalPrice] = useState(null)
  const [pricedCount, setPricedCount] = useState(0)
  const [itemCount, setItemCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const items = useMemo(() => getGearItems(gear), [gear])

  const priceKey = useMemo(() => {
    return items
      .map((item) => `${getItemType(item)}:${getItemQuality(item)}:${getItemCount(item)}`)
      .join('|')
  }, [items])

  useEffect(() => {
    if (items.length === 0) return

    let cancelled = false

    async function loadTotalPrice() {
      setLoading(true)

      try {
        const payload = {
          items: items.map((item) => ({
            type: getItemType(item),
            quality: getItemQuality(item),
            count: getItemCount(item),
          })),
        }

        const res = await fetch(`${API_URL}/gear-value`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          throw new Error('Erreur API gear-value')
        }

        const data = await res.json()

        if (cancelled) return

        setTotalPrice(Number(data.total || 0))
        setPricedCount(Number(data.pricedCount || 0))
        setItemCount(Number(data.itemCount || items.length))
      } catch (error) {
        console.warn('Erreur estimation stuff:', error)

        if (!cancelled) {
          setTotalPrice(null)
          setPricedCount(0)
          setItemCount(items.length)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTotalPrice()

    return () => {
      cancelled = true
    }
  }, [items, priceKey])

  if (items.length === 0) {
    return (
      <div className="gearValueBottom unavailable">
        Valeur estimee : indisponible
      </div>
    )
  }

  if (loading && !totalPrice) {
    return <div className="gearValueBottom">Valeur estimée : chargement...</div>
  }

  if (!totalPrice || pricedCount === 0) {
    return (
      <div className="gearValueBottom unavailable">
        Valeur estimée : indisponible
      </div>
    )
  }

  return (
    <div className="gearValueBottom">
      Valeur estimée : {formatShortSilver(totalPrice)}
      {pricedCount < itemCount && <span> · partiel</span>}
    </div>
  )
}

async function fetchGearValue(items = []) {
  if (items.length === 0) {
    return {
      total: 0,
      pricedCount: 0,
      itemCount: 0,
    }
  }

  const res = await fetch(`${API_URL}/gear-value`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  })

  if (!res.ok) {
    throw new Error('Erreur API gear-value')
  }

  return res.json()
}

function DailySilverBar({ fights = [] }) {
  const [summary, setSummary] = useState({
    gained: 0,
    lost: 0,
    pricedCount: 0,
    itemCount: 0,
    loading: false,
    unavailable: false,
  })

  const dailyItems = useMemo(() => getDailySilverItems(fights), [fights])
  const dailyKey = useMemo(() => {
    return [...dailyItems.gainedItems, ...dailyItems.lostItems]
      .map((item) => `${item.type}:${item.quality}:${item.count}`)
      .join('|')
  }, [dailyItems])

  useEffect(() => {
    let cancelled = false

    async function loadDailySilver() {
      if (dailyItems.fights.length === 0) {
        setSummary({
          gained: 0,
          lost: 0,
          pricedCount: 0,
          itemCount: 0,
          loading: false,
          unavailable: false,
        })
        return
      }

      setSummary((current) => ({
        ...current,
        loading: true,
        unavailable: false,
      }))

      try {
        const [gainedValue, lostValue] = await Promise.all([
          fetchGearValue(dailyItems.gainedItems),
          fetchGearValue(dailyItems.lostItems),
        ])

        if (cancelled) return

        setSummary({
          gained: Number(gainedValue.total || 0),
          lost: Number(lostValue.total || 0),
          pricedCount:
            Number(gainedValue.pricedCount || 0) +
            Number(lostValue.pricedCount || 0),
          itemCount:
            Number(gainedValue.itemCount || 0) +
            Number(lostValue.itemCount || 0),
          loading: false,
          unavailable: false,
        })
      } catch (error) {
        console.warn('Erreur estimation silver jour:', error)

        if (!cancelled) {
          setSummary((current) => ({
            ...current,
            loading: false,
            unavailable: true,
          }))
        }
      }
    }

    loadDailySilver()

    return () => {
      cancelled = true
    }
  }, [dailyItems, dailyKey])

  const net = summary.gained - summary.lost
  const totalFlow = Math.max(summary.gained + summary.lost, 1)
  const gainedWidth = summary.gained ? Math.max((summary.gained / totalFlow) * 100, 6) : 0
  const lostWidth = summary.lost ? Math.max((summary.lost / totalFlow) * 100, 6) : 0
  const subtitle = summary.loading
    ? 'Estimation en cours...'
    : summary.unavailable
      ? 'Prix indisponibles pour le moment'
      : `${dailyItems.fights.length} fights aujourd'hui · kills uniquement · ${summary.pricedCount}/${summary.itemCount} items prices`

  return (
    <section className="dailySilverBar">
      <div className="dailySilverTitle">
        <strong>Silver aujourd'hui</strong>
        <span>Estimation kills uniquement</span>
      </div>

      <div className="dailySilverValues">
        <div>
          <small>Gagne</small>
          <strong className="green">+{formatShortSilver(summary.gained)}</strong>
        </div>
        <div>
          <small>Perdu</small>
          <strong className="red">-{formatShortSilver(summary.lost)}</strong>
        </div>
        <div>
          <small>Net</small>
          <strong className={net >= 0 ? 'gold' : 'red'}>
            {formatSilverBalance(net)}
          </strong>
        </div>
      </div>

      <div className="dailySilverFlow">
        <div className="silverFlowTrack">
          <span style={{ width: `${gainedWidth}%` }} />
          <i style={{ width: `${lostWidth}%` }} />
        </div>
        <small>{subtitle}</small>
      </div>
    </section>
  )
}

function DailySilverHistoryChart({ fights = [] }) {
  const [history, setHistory] = useState({
    days: [],
    loading: false,
    unavailable: false,
  })

  const buckets = useMemo(() => getSilverBucketsByDay(fights, 10), [fights])
  const historyKey = useMemo(() => {
    return buckets
      .map((bucket) => {
        const gainedKey = bucket.gainedItems
          .map((item) => `${item.type}:${item.quality}:${item.count}`)
          .join(',')
        const lostKey = bucket.lostItems
          .map((item) => `${item.type}:${item.quality}:${item.count}`)
          .join(',')

        return `${bucket.key}|${gainedKey}|${lostKey}`
      })
      .join(';')
  }, [buckets])

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setHistory((current) => ({
        ...current,
        loading: true,
        unavailable: false,
      }))

      try {
        const days = await Promise.all(
          buckets.map(async (bucket) => {
            const [gainedValue, lostValue] = await Promise.all([
              fetchGearValue(bucket.gainedItems),
              fetchGearValue(bucket.lostItems),
            ])

            return {
              ...bucket,
              gained: Number(gainedValue.total || 0),
              lost: Number(lostValue.total || 0),
              pricedCount:
                Number(gainedValue.pricedCount || 0) +
                Number(lostValue.pricedCount || 0),
              itemCount:
                Number(gainedValue.itemCount || 0) +
                Number(lostValue.itemCount || 0),
            }
          })
        )

        if (cancelled) return

        setHistory({
          days,
          loading: false,
          unavailable: false,
        })
      } catch (error) {
        console.warn('Erreur historique silver:', error)

        if (!cancelled) {
          setHistory((current) => ({
            ...current,
            loading: false,
            unavailable: true,
          }))
        }
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [buckets, historyKey])

  const days = history.days.length ? history.days : buckets
  const totalGained = days.reduce((sum, day) => sum + Number(day.gained || 0), 0)
  const totalLost = days.reduce((sum, day) => sum + Number(day.lost || 0), 0)
  const totalNet = totalGained - totalLost
  const maxValue = Math.max(
    ...days.flatMap((day) => [Number(day.gained || 0), Number(day.lost || 0)]),
    1
  )
  const pricedCount = days.reduce((sum, day) => sum + Number(day.pricedCount || 0), 0)
  const itemCount = days.reduce((sum, day) => sum + Number(day.itemCount || 0), 0)
  const subtitle = history.loading
    ? 'Estimation en cours...'
    : history.unavailable
      ? 'Prix indisponibles pour le moment'
      : `10 derniers jours · kills uniquement · ${pricedCount}/${itemCount} items prices`

  return (
    <section className="silverHistoryCard">
      <div className="silverHistoryHeader">
        <div>
          <strong>Silver par jour</strong>
          <span>{subtitle}</span>
        </div>

        <div className="silverHistoryTotals">
          <div><small>Gagne</small><b className="green">+{formatShortSilver(totalGained)}</b></div>
          <div><small>Perdu</small><b className="red">-{formatShortSilver(totalLost)}</b></div>
          <div><small>Net</small><b className={totalNet >= 0 ? 'gold' : 'red'}>{formatSilverBalance(totalNet)}</b></div>
        </div>
      </div>

      <div className="silverHistoryChart">
        {days.map((day) => {
          const gainedHeight = day.gained
            ? Math.max((day.gained / maxValue) * 100, 8)
            : 0
          const lostHeight = day.lost
            ? Math.max((day.lost / maxValue) * 100, 8)
            : 0
          const net = Number(day.gained || 0) - Number(day.lost || 0)

          return (
            <div className="silverDay" key={day.key}>
              <div className="silverDayBars">
                <span
                  style={{ height: `${gainedHeight}%` }}
                  title={`${day.label} gagné : ${formatShortSilver(day.gained || 0)}`}
                />
                <i
                  style={{ height: `${lostHeight}%` }}
                  title={`${day.label} perdu : ${formatShortSilver(day.lost || 0)}`}
                />
              </div>

              <strong className={net >= 0 ? 'green' : 'red'}>
                {formatSilverBalance(net)}
              </strong>
              <small>{day.label}</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ItemModal({ item, onClose }) {
  const [priceData, setPriceData] = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)

  const info = item ? parseItemInfo(item) : null

  useEffect(() => {
    if (!item || !info?.id) return

    let cancelled = false

    async function loadPrice() {
      setPriceLoading(true)
      setPriceData(null)

      const result = await fetchItemPrice(item)

      if (!cancelled) {
        setPriceData(result)
        setPriceLoading(false)
      }
    }

    loadPrice()

    return () => {
      cancelled = true
    }
  }, [item, info?.id, info?.quality])

  if (!item || !info) return null

  const marketPrice = priceLoading
    ? 'Chargement...'
    : priceData?.price
      ? formatSilver(priceData.price)
      : 'Prix indisponible'

  const marketCity = priceData?.city ? `Ville : ${priceData.city}` : ''
  const fallbackText = priceData?.fallback ? 'Prix estimé avec fallback' : ''

  return (
    <div className="itemModalOverlay" onClick={onClose}>
      <div className="itemModal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="itemModalClose" onClick={onClose}>
          ×
        </button>

        <div className="itemModalTop">
          <img src={info.image} alt={info.name} />

          <div>
            <h2>
              T{info.tier}
              {info.enchant !== '0' ? `.${info.enchant}` : ''} {info.name}
            </h2>

            <div className="itemModalTags">
              <span>{info.type}</span>
              <span>Tier {info.tier}</span>
              <span>Enchant +{info.enchant}</span>
              <span>{info.qualityLabel}</span>
              {info.count > 1 && <span>x{info.count}</span>}
            </div>
          </div>
        </div>

        <div className="itemModalStats">
          <div>
            <small>ID Albion</small>
            <strong>{info.id}</strong>
          </div>

          <div>
            <small>Qualité</small>
            <strong>{info.qualityLabel}</strong>
          </div>

          <div>
            <small>Quantité</small>
            <strong>x{info.count}</strong>
          </div>

          <div>
            <small>Prix marché</small>
            <strong>{marketPrice}</strong>
            {marketCity && <span className="itemModalSub">{marketCity}</span>}
            {fallbackText && <span className="itemModalSub">{fallbackText}</span>}
          </div>
        </div>

        <div className="itemModalDescription">
          <h3>Description</h3>
          <p>
            Les statistiques détaillées, les sorts et les passifs pourront être
            affichés ici quand la base d’items Albion sera connectée.
          </p>
        </div>
      </div>
    </div>
  )
}

function getWeaponStatsFromFights(fights = []) {
  const weapons = {}

  fights.forEach((fight) => {
    const weapon = fight.weapon || 'Inconnu'

    if (!weapons[weapon]) {
      weapons[weapon] = { weapon, kills: 0, deaths: 0 }
    }

    if (fight.type === 'kill') weapons[weapon].kills += 1
    if (fight.type === 'death') weapons[weapon].deaths += 1
  })

  return Object.values(weapons)
    .map((weapon) => {
      const total = weapon.kills + weapon.deaths

      return {
        ...weapon,
        total,
        kd: (weapon.kills / Math.max(weapon.deaths, 1)).toFixed(2),
        winrate: total ? `${Math.round((weapon.kills / total) * 100)}%` : '0%',
      }
    })
    .sort((a, b) => b.total - a.total)
}

function getMostUsedLabel(counts = {}, fallback = '-') {
  const [label] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || []
  return label || fallback
}

function getTopEntries(counts = {}, limit = 3) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

function getWeaponTier(itemType = '') {
  const tier = String(itemType).match(/^T(\d+)/i)?.[1]
  return tier ? `T${tier}` : '-'
}

function getWeaponEnchant(itemType = '') {
  const enchant = String(itemType).match(/@(\d+)/)?.[1]
  return enchant ? `.${enchant}` : '.0'
}

function incrementCount(counts, label) {
  if (!label) return
  counts[label] = (counts[label] || 0) + 1
}

function getPlayerWeaponItem(fight = {}) {
  return fight.type === 'kill'
    ? fight.killerGear?.mainHand
    : fight.victimGear?.mainHand
}

function getWeaponDeepStats(fights = []) {
  const weapons = {}

  fights.forEach((fight) => {
    const weapon = fight.weapon || 'Inconnu'
    const weaponItem = getPlayerWeaponItem(fight) || {}

    if (!weapons[weapon]) {
      weapons[weapon] = {
        weapon,
        fights: [],
        kills: 0,
        deaths: 0,
        solo: 0,
        pvp: 0,
        totalFame: 0,
        itemPowerTotal: 0,
        itemPowerCount: 0,
        tiers: {},
        enchants: {},
        qualities: {},
        opponentWeapons: {},
        activeSpells: {},
        passiveSpells: {},
      }
    }

    const stats = weapons[weapon]
    const fame = parseFightFame(fight.fame)

    stats.fights.push(fight)
    stats.totalFame += fame
    if (fight.type === 'kill') stats.kills += 1
    if (fight.type === 'death') stats.deaths += 1
    if (fight.zone === 'Solo') stats.solo += 1
    else stats.pvp += 1

    if (fight.itemPower) {
      stats.itemPowerTotal += Number(fight.itemPower)
      stats.itemPowerCount += 1
    }

    incrementCount(stats.tiers, getWeaponTier(weapon))
    incrementCount(stats.enchants, getWeaponEnchant(weapon))
    incrementCount(stats.qualities, getQualityLabel(weaponItem.quality))
    incrementCount(stats.opponentWeapons, cleanItemName(fight.opponentWeapon || 'Inconnu'))

    ;(weaponItem.activeSpells || []).forEach((spell) =>
      incrementCount(stats.activeSpells, spell)
    )
    ;(weaponItem.passiveSpells || []).forEach((spell) =>
      incrementCount(stats.passiveSpells, spell)
    )
  })

  return Object.values(weapons)
    .map((stats) => {
      const total = stats.kills + stats.deaths
      const recent = [...stats.fights]
        .sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0))
        .slice(0, 8)
        .reverse()

      return {
        ...stats,
        total,
        kd: (stats.kills / Math.max(stats.deaths, 1)).toFixed(2),
        winrate: total ? Math.round((stats.kills / total) * 100) : 0,
        avgFame: total ? stats.totalFame / total : 0,
        avgIp: stats.itemPowerCount
          ? Math.round(stats.itemPowerTotal / stats.itemPowerCount)
          : 0,
        mainTier: getMostUsedLabel(stats.tiers),
        mainEnchant: getMostUsedLabel(stats.enchants),
        mainQuality: getMostUsedLabel(stats.qualities),
        topOpponentWeapons: getTopEntries(stats.opponentWeapons, 3),
        topActiveSpells: getTopEntries(stats.activeSpells, 4),
        topPassiveSpells: getTopEntries(stats.passiveSpells, 3),
        recent,
      }
    })
    .sort((a, b) => b.total - a.total)
}

function parseFightFame(value) {
  if (typeof value === 'number') return value
  if (!value) return 0

  const text = String(value).replace('+', '').replace('-', '').trim()
  const number = Number.parseFloat(text)
  if (!Number.isFinite(number)) return 0

  if (text.toUpperCase().includes('M')) return number * 1000000
  if (text.toUpperCase().includes('K')) return number * 1000

  return number
}

function formatAnalyticsNumber(value) {
  if (!value) return '0'
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${Math.round(value / 1000)}K`

  return String(Math.round(value))
}

function getFightAnalytics(fights = []) {
  const ordered = [...fights]
    .filter((fight) => fight?.type)
    .sort((a, b) => (a.rawDate || 0) - (b.rawDate || 0))

  const recent = ordered.slice(-30)
  let score = 0
  let currentStreak = 0
  let streakType = null
  const contentCounts = {}
  let totalFame = 0

  recent.forEach((fight) => {
    const isKill = fight.type === 'kill'
    const fightFame = parseFightFame(fight.fame)

    score += isKill ? 1 : -1
    totalFame += fightFame

    const contentLabel = fight.zone || fight.content?.label || 'PvP'
    contentCounts[contentLabel] = (contentCounts[contentLabel] || 0) + 1

    if (fight.type === streakType) {
      currentStreak += 1
    } else {
      streakType = fight.type
      currentStreak = 1
    }
  })

  const kills = recent.filter((fight) => fight.type === 'kill').length
  const deaths = recent.filter((fight) => fight.type === 'death').length
  const points = recent.map((fight, index) => {
    const partialScore = recent
      .slice(0, index + 1)
      .reduce((total, item) => total + (item.type === 'kill' ? 1 : -1), 0)

    return {
      fight,
      value: partialScore,
    }
  })

  const values = points.map((point) => point.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const range = Math.max(max - min, 1)

  return {
    recent,
    points,
    min,
    max,
    range,
    kills,
    deaths,
    score,
    winrate: recent.length ? Math.round((kills / recent.length) * 100) : 0,
    avgFame: recent.length ? totalFame / recent.length : 0,
    contentCounts,
    streak: recent.length ? currentStreak : 0,
    streakType,
  }
}

function FightTrendChart({ analytics, onFightSelect }) {
  const width = 620
  const height = 220
  const padding = 26
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const coordinates = analytics.points.map((point, index) => {
    const x = padding + (index / Math.max(analytics.points.length - 1, 1)) * chartWidth
    const y =
      padding +
      ((analytics.max - point.value) / analytics.range) * chartHeight

    return { ...point, x, y }
  })

  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  const area = coordinates.length
    ? `${padding},${height - padding} ${line} ${width - padding},${height - padding}`
    : ''
  const baseline =
    padding + ((analytics.max - 0) / analytics.range) * chartHeight

  return (
    <div className="analyticsCard trendCard">
      <div className="analyticsHeader">
        <div>
          <strong>Forme recente</strong>
          <span>{analytics.recent.length} derniers fights</span>
        </div>

        <div className="analyticsPills">
          <span className="green">{analytics.kills} K</span>
          <span className="red">{analytics.deaths} D</span>
          <span>{analytics.winrate}% WR</span>
        </div>
      </div>

      {coordinates.length > 1 ? (
        <svg
          className="fightLineChart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Courbe de performance recente"
        >
          <line x1={padding} x2={width - padding} y1={baseline} y2={baseline} />
          {[0, 1, 2, 3].map((lineIndex) => {
            const y = padding + (lineIndex / 3) * chartHeight
            return (
              <line
                className="chartGridLine"
                key={lineIndex}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
              />
            )
          })}
          <polygon className="chartArea" points={area} />
          <polyline className="chartLine" points={line} />
          {coordinates.map((point, index) => (
            <circle
              key={`${point.fight.id}-${index}`}
              className={point.fight.type === 'kill' ? 'chartDotKill' : 'chartDotDeath'}
              cx={point.x}
              cy={point.y}
              r="5"
              role="button"
              tabIndex="0"
              aria-label={`${point.fight.type === 'kill' ? 'Ouvrir le kill' : 'Ouvrir la mort'} contre ${point.fight.opponent}`}
              onClick={() => onFightSelect?.(point.fight)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return

                event.preventDefault()
                onFightSelect?.(point.fight)
              }}
            />
          ))}
        </svg>
      ) : (
        <div className="emptyAnalytics">Pas assez de fights pour tracer une courbe</div>
      )}

      <div className="graphSummary">
        <div>
          <small>Serie</small>
          <strong className={analytics.streakType === 'kill' ? 'green' : 'red'}>
            {analytics.streak ? `${analytics.streak} ${analytics.streakType === 'kill' ? 'W' : 'L'}` : '0'}
          </strong>
        </div>
        <div>
          <small>Fame moy.</small>
          <strong>{formatAnalyticsNumber(analytics.avgFame)}</strong>
        </div>
        <div>
          <small>Score</small>
          <strong className={analytics.score >= 0 ? 'green' : 'red'}>
            {analytics.score > 0 ? '+' : ''}{analytics.score}
          </strong>
        </div>
      </div>
    </div>
  )
}

function FightTimeline({ analytics, onFightSelect }) {
  const timeline = analytics.recent.slice(-20)
  const maxFame = Math.max(...timeline.map((fight) => parseFightFame(fight.fame)), 1)

  return (
    <div className="analyticsCard">
      <div className="analyticsHeader">
        <div>
          <strong>Timeline fights</strong>
          <span>Kills au-dessus, morts en dessous</span>
        </div>
      </div>

      <div className="fightTimeline">
        {timeline.map((fight, index) => {
          const heightPercent = Math.max((parseFightFame(fight.fame) / maxFame) * 100, 18)

          return (
            <button
              type="button"
              className="timelineSlot"
              key={`${fight.id}-${index}`}
              onClick={() => onFightSelect?.(fight)}
              aria-label={`${fight.type === 'kill' ? 'Ouvrir le kill' : 'Ouvrir la mort'} contre ${fight.opponent}`}
            >
              <span
                className={`timelineBar ${fight.type}`}
                style={{ '--bar-size': `${heightPercent}%` }}
                title={`${fight.type === 'kill' ? 'Kill' : 'Mort'} - ${fight.fame}`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FightDistribution({ analytics, weaponStats }) {
  const total = Math.max(analytics.recent.length, 1)
  const soloCount = analytics.contentCounts.Solo || 0
  const soloPercent = Math.round((soloCount / total) * 100)
  const pvpCount = total - soloCount
  const topWeapons = weaponStats.slice(0, 4)
  const topWeaponTotal = Math.max(...topWeapons.map((weapon) => weapon.total), 1)

  return (
    <div className="analyticsCard distributionCard">
      <div className="analyticsHeader">
        <div>
          <strong>Repartition</strong>
          <span>Contenu et armes dominantes</span>
        </div>
      </div>

      <div className="distributionGrid">
        <div
          className="contentDonut"
          style={{ '--solo-percent': `${soloPercent}%` }}
        >
          <strong>{soloPercent}%</strong>
          <span>Solo</span>
        </div>

        <div className="contentLegend">
          <div><span className="legendDot greenBg" />Solo <strong>{soloCount}</strong></div>
          <div><span className="legendDot purpleBg" />PvP <strong>{pvpCount}</strong></div>
        </div>
      </div>

      <div className="topWeaponBars">
        {topWeapons.map((weapon) => (
          <div className="topWeaponBar" key={weapon.weapon}>
            <span>{cleanItemName(weapon.weapon)}</span>
            <div>
              <i style={{ width: `${Math.max((weapon.total / topWeaponTotal) * 100, 8)}%` }} />
            </div>
            <strong>{weapon.total}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeaponDeepStatsTab({ weapons = [], onFightSelect, onWeaponSelect }) {
  if (weapons.length === 0) {
    return (
      <section className="weaponStatsTab">
        <div className="emptyAnalytics">Aucune arme trouvee dans les fights charges</div>
      </section>
    )
  }

  return (
    <section className="weaponStatsTab">
      <div className="weaponStatsHeader">
        <div>
          <h2>Stats par arme</h2>
          <p>Base sur les fights charges, sans inventer les spells non fournis par l'API.</p>
        </div>
      </div>

      <div className="weaponDeepList">
        {weapons.map((weapon) => (
          <article className="weaponDeepCard" key={weapon.weapon}>
            <div className="weaponDeepTop">
              <button
                type="button"
                className="weaponDeepIdentity weaponDeepIdentityButton"
                onClick={() => onWeaponSelect?.({ weapon: weapon.weapon })}
                disabled={weapon.weapon === 'Inconnu'}
              >
                {weapon.weapon !== 'Inconnu' ? (
                  <img
                    src={getItemImage(weapon.weapon)}
                    alt={cleanItemName(weapon.weapon)}
                  />
                ) : (
                  <div className="weaponMini">?</div>
                )}

                <div>
                  <strong>{cleanItemName(weapon.weapon)}</strong>
                  <span>
                    {weapon.total} fights · {weapon.mainTier} {weapon.mainEnchant} · {weapon.mainQuality}
                  </span>
                </div>
              </button>

              <div className="weaponRecentForm">
                {weapon.recent.map((fight) => (
                  <button
                    type="button"
                    key={fight.id}
                    className={`formDot ${fight.type}`}
                    onClick={() => onFightSelect?.(fight)}
                    title={`${fight.type === 'kill' ? 'Kill' : 'Mort'} vs ${fight.opponent}`}
                    aria-label={`${fight.type === 'kill' ? 'Ouvrir le kill' : 'Ouvrir la mort'} contre ${fight.opponent}`}
                  />
                ))}
              </div>
            </div>

            <div className="weaponDeepMetrics">
              <div><small>K</small><strong className="green">{weapon.kills}</strong></div>
              <div><small>D</small><strong className="red">{weapon.deaths}</strong></div>
              <div><small>KD</small><strong>{weapon.kd}</strong></div>
              <div><small>WR</small><strong>{weapon.winrate}%</strong></div>
              <div><small>Fame moy.</small><strong>{formatAnalyticsNumber(weapon.avgFame)}</strong></div>
              <div><small>IP moy.</small><strong>{weapon.avgIp || '-'}</strong></div>
            </div>

            <div className="weaponDeepBottom">
              <div className="weaponBreakdown">
                <div className="breakdownTitle">Contenu</div>
                <div className="miniSplit">
                  <span style={{ width: `${Math.max((weapon.solo / Math.max(weapon.total, 1)) * 100, weapon.solo ? 8 : 0)}%` }} />
                  <i style={{ width: `${Math.max((weapon.pvp / Math.max(weapon.total, 1)) * 100, weapon.pvp ? 8 : 0)}%` }} />
                </div>
                <div className="miniLegend">
                  <span>Solo {weapon.solo}</span>
                  <span>PvP {weapon.pvp}</span>
                </div>
              </div>

              <div className="weaponBreakdown">
                <div className="breakdownTitle">Armes adverses</div>
                <div className="weaponTagList">
                  {weapon.topOpponentWeapons.map((entry) => (
                    <span key={entry.label}>{entry.label} x{entry.count}</span>
                  ))}
                </div>
              </div>

              <div className="weaponBreakdown spellBreakdown">
                <div className="breakdownTitle">Spells API</div>
                {weapon.topActiveSpells.length > 0 || weapon.topPassiveSpells.length > 0 ? (
                  <div className="weaponTagList">
                    {[...weapon.topActiveSpells, ...weapon.topPassiveSpells].map((entry) => (
                      <span key={entry.label}>{entry.label} x{entry.count}</span>
                    ))}
                  </div>
                ) : (
                  <p>Non fourni sur ces fights</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function GearGrid({ title, gear = {}, onItemClick }) {
  return (
    <div className="inventoryBox gearBox">
      <h3>{title}</h3>

      <div className="gearGrid">
        {GEAR_ORDER.map((slot) => {
          if (slot.empty) {
            return (
              <div
                key={slot.key}
                className="gearSlot gearSlotEmpty"
                aria-hidden="true"
              />
            )
          }

          const item = gear?.[slot.key]
          const itemType = getItemType(item)

          return (
            <button
              type="button"
              className={`gearSlot ${!item ? 'emptyGearSlot' : getQualityClass(item)}`}
              key={slot.key}
              title={item ? cleanItemName(itemType) : slot.label}
              onClick={() => item && onItemClick(item)}
            >
              {item ? (
                <>
                  <img src={getItemImage(itemType)} alt={cleanItemName(itemType)} />
                  {getItemCount(item) > 1 && (
                    <span className="itemCount">x{getItemCount(item)}</span>
                  )}
                </>
              ) : (
                <div className="gearSlotPlaceholder" />
              )}
            </button>
          )
        })}
      </div>

      <GearValue gear={gear} />
    </div>
  )
}

function InventoryGrid({ title, items = [], onItemClick }) {
  return (
    <div className="inventoryBox gearBox">
      <h3>{title}</h3>

      {items.length > 0 ? (
        <div className="gearGrid inventoryGrid">
          {items.map((item, index) => {
            const itemType = getItemType(item)
            const count = getItemCount(item)

            return (
              <button
                type="button"
                className={`gearSlot ${getQualityClass(item)}`}
                key={`${itemType}-${index}`}
                title={cleanItemName(itemType)}
                onClick={() => onItemClick(item)}
              >
                <img src={getItemImage(itemType)} alt={cleanItemName(itemType)} />
                {count > 1 && <span className="itemCount">x{count}</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="emptyGear">Inventaire indisponible</p>
      )}
    </div>
  )
}

function AssistsBox({ fight, suffix = '', onPlayerSearch }) {
  return (
    <div className="assistBox">
      <h3>Aides</h3>

      {fight.assists?.length > 0 ? (
        fight.assists.map((assist) => (
          <button
            type="button"
            className="assistPlayerBtn"
            key={`${fight.id}-${suffix}-${assist}`}
            onClick={() => onPlayerSearch?.(assist)}
          >
            {assist}
          </button>
        ))
      ) : (
        <p>Aucune aide</p>
      )}
    </div>
  )
}

function FightDetails({ fight, onItemClick, onPlayerSearch }) {
  const [viewMode, setViewMode] = useState('compare')

  return (
    <div className="fightDetailsWrap">
      <div className="detailsToolbar">
        <div className="detailsViewTabs">
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={viewMode === 'compare' ? 'activeDetailsTab' : ''}
          >
            Comparer
          </button>

          <button
            type="button"
            onClick={() => setViewMode('inventory')}
            className={viewMode === 'inventory' ? 'activeDetailsTab' : ''}
          >
            Inventaire
          </button>
        </div>
      </div>

      {viewMode === 'compare' && (
        <div className="matchDetails gearDetails">
          <GearGrid
            title="Stuff du tueur"
            gear={fight.killerGear}
            onItemClick={onItemClick}
          />

          <GearGrid
            title="Stuff de la victime"
            gear={fight.victimGear}
            onItemClick={onItemClick}
          />

          <AssistsBox
            fight={fight}
            suffix="compare"
            onPlayerSearch={onPlayerSearch}
          />
        </div>
      )}

      {viewMode === 'inventory' && (
        <div className="inventoryMode singleInventoryMode">
          <InventoryGrid
            title="Inventaire de la victime"
            items={fight.victimBag || []}
            onItemClick={onItemClick}
          />

          <AssistsBox
            fight={fight}
            suffix="inventory"
            onPlayerSearch={onPlayerSearch}
          />
        </div>
      )}
    </div>
  )
}

export default function PlayerProfile({ player, onPlayerSearch, onWeaponSelect }) {
  const [tab, setTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedFightId, setSelectedFightId] = useState(null)
  const [pendingScrollFightId, setPendingScrollFightId] = useState(null)

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return

      setTab('overview')
      setCurrentPage(1)
      setSelectedItem(null)
      setSelectedFightId(null)
      setPendingScrollFightId(null)
    })

    return () => {
      cancelled = true
    }
  }, [player?.name])

  useEffect(() => {
    if (tab !== 'overview' || !pendingScrollFightId) return

    const timer = window.setTimeout(() => {
      const fightRow = document.getElementById(`fight-${pendingScrollFightId}`)
      if (!fightRow) return

      fightRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setPendingScrollFightId(null)
    }, 80)

    return () => window.clearTimeout(timer)
  }, [currentPage, pendingScrollFightId, tab])

  if (!player) return null

  const fights = player.fights || []
  const weaponStats = getWeaponStatsFromFights(fights)
  const weaponDeepStats = getWeaponDeepStats(fights)
  const fightAnalytics = getFightAnalytics(fights)
  const sideStats = player.stats?.length
    ? player.stats
    : [
        { label: 'PvP', value: player.pvp },
        { label: 'PvE', value: player.pve },
        { label: 'Récolte', value: player.gathering },
        { label: 'Fabrication', value: player.crafting },
        { label: 'Infamie', value: player.infamy },
        { label: 'Hellgate', value: player.hellgate },
      ]

  const kd = (player.kills / Math.max(player.deaths, 1)).toFixed(2)
  const winrate = Math.round(
    (player.kills / Math.max(player.kills + player.deaths, 1)) * 100
  )

  const totalPages = Math.ceil(fights.length / FIGHTS_PER_PAGE)
  const startIndex = (currentPage - 1) * FIGHTS_PER_PAGE
  const visibleFightList = fights.slice(startIndex, startIndex + FIGHTS_PER_PAGE)

  function goToPage(page) {
    if (page < 1 || page > totalPages) return

    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openFightFromGraph(fight) {
    const fightIndex = fights.findIndex((item) => item.id === fight?.id)
    if (fightIndex === -1) return

    const page = Math.floor(fightIndex / FIGHTS_PER_PAGE) + 1

    setTab('overview')
    setCurrentPage(page)
    setSelectedFightId(fight.id)
    setPendingScrollFightId(fight.id)
  }

  return (
    <main className="trackerPage">
      <section className="trackerGrid">
        <aside className="trackerSidebar">
          <div className="profileCard noAvatar">
            <h1>{player.name}</h1>
            <p>{player.guild}</p>
            <span className="guildTag">{player.tag}</span>
          </div>

          <div className="weaponPerformance">
            <div className="weaponPerfTop">
              <strong>Performance par arme</strong>
              <span>Basé sur les fights chargés</span>
            </div>

            <div className="weaponPerfHead">
              <span>Arme</span>
              <span>KD</span>
              <span>K</span>
              <span>D</span>
              <span>WR</span>
            </div>

            {weaponStats.length > 0 ? (
              weaponStats.map((weapon) => (
                <button
                  type="button"
                  className="weaponPerfRow"
                  key={weapon.weapon}
                  onClick={() => onWeaponSelect?.({ weapon: weapon.weapon })}
                  disabled={weapon.weapon === 'Inconnu'}
                >
                  <div className="weaponPerfName">
                    {weapon.weapon !== 'Inconnu' ? (
                      <img
                        className="weaponIcon"
                        src={getItemImage(weapon.weapon)}
                        alt={cleanItemName(weapon.weapon)}
                      />
                    ) : (
                      <div className="weaponMini">?</div>
                    )}

                    <div>
                      <strong>{cleanItemName(weapon.weapon)}</strong>
                      <small>{weapon.total} fights</small>
                    </div>
                  </div>

                  <span>{weapon.kd}</span>
                  <b className="green">{weapon.kills}</b>
                  <b className="red">{weapon.deaths}</b>
                  <b className="gold">{weapon.winrate}</b>
                </button>
              ))
            ) : (
              <p className="emptyWeaponStats">Aucune arme trouvée</p>
            )}
          </div>

          <div className="sideStats">
            {sideStats.map((stat) => (
              <div key={stat.label}>
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className="trackerMain">
          <div className="overviewBar">
            <div className="circleStat">
              <strong>{winrate}%</strong>
              <span>Winrate</span>
            </div>

            <div className="overviewNumbers">
              <div><small>Kills</small><strong className="green">{player.kills}</strong></div>
              <div><small>Morts</small><strong className="red">{player.deaths}</strong></div>
              <div><small>KD</small><strong>{kd}</strong></div>
            </div>
          </div>

          <DailySilverBar fights={fights} />

          <div className="profileTabs">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={tab === 'overview' ? 'activeTab' : ''}
            >
              Aperçu
            </button>

            <button
              type="button"
              onClick={() => setTab('stats')}
              className={tab === 'stats' ? 'activeTab' : ''}
            >
              Stats
            </button>

            <button
              type="button"
              onClick={() => setTab('weapons')}
              className={tab === 'weapons' ? 'activeTab' : ''}
            >
              Armes
            </button>
          </div>

          {tab === 'overview' && (
            <>
              <div className="trackerSectionTitle">
                <h2>Parties récentes</h2>
                <p>
                  Résultat, équipement, fame et détails du fight.
                  {totalPages > 1 && ` Page ${currentPage}/${totalPages}`}
                </p>
              </div>

              <div className="matchList">
                {visibleFightList.map((fight) => (
                  <details
                    id={`fight-${fight.id}`}
                    className={`matchRow ${fight.type} ${selectedFightId === fight.id ? 'selectedFight' : ''}`}
                    key={fight.id}
                    open={selectedFightId === fight.id}
                    onToggle={(event) => {
                      if (event.currentTarget.open) {
                        setSelectedFightId(fight.id)
                      } else if (selectedFightId === fight.id) {
                        setSelectedFightId(null)
                      }
                    }}
                  >
                    <summary>
                      <div className="matchResult">
                        {fight.type === 'kill' ? 'Victoire' : 'Défaite'}
                        <span>{fight.time}</span>
                      </div>

                      <div className="matchWeapon weaponWithIcon">
                        {fight.weapon && fight.weapon !== 'Inconnu' && (
                          <img
                            src={getItemImage(fight.weapon)}
                            alt={cleanItemName(fight.weapon)}
                          />
                        )}

                        <div>
                          <strong>{cleanItemName(fight.weapon)}</strong>
                          <span title={fight.content?.reason || ''}>
                            {fight.zone || 'Lieu inconnu'}
                            {fight.content?.confidence === 'low' && ' ?'}
                          </span>
                        </div>
                      </div>

                      <div className="opponentWeaponMini">
                        {fight.opponentWeapon && fight.opponentWeapon !== 'Inconnu' && (
                          <img
                            src={getItemImage(fight.opponentWeapon)}
                            alt={cleanItemName(fight.opponentWeapon)}
                            title={`Arme adverse : ${cleanItemName(fight.opponentWeapon)}`}
                          />
                        )}
                      </div>

                      <div className="matchAssists">
                        <span className="assistIcon">👥</span>
                        <strong>+{fight.assists?.length || 0}</strong>
                      </div>

                      <div className="matchScore">
                        <strong className={fight.type === 'kill' ? 'green' : 'red'}>
                          {fight.type === 'kill' ? '+' : '-'}{fight.fame}
                        </strong>
                        <span>Fame</span>
                      </div>

                      <div className="matchOpponent">
                        <span>{fight.type === 'kill' ? 'Victime' : 'Tueur'}</span>

                        <button
                          type="button"
                          className="opponentPlayerBtn"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            onPlayerSearch?.(fight.opponent)
                          }}
                        >
                          {fight.opponent}
                        </button>
                      </div>

                      <div className="matchArrow">⌄</div>
                    </summary>

                    <FightDetails
                      fight={fight}
                      onItemClick={setSelectedItem}
                      onPlayerSearch={onPlayerSearch}
                    />
                  </details>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1

                    return (
                      <button
                        type="button"
                        key={page}
                        onClick={() => goToPage(page)}
                        className={currentPage === page ? 'activePage' : ''}
                      >
                        {page}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'stats' && (
            <section className="statOverview">
              <div className="perfCards">
                <div><strong className="green">{player.kills}</strong><span>Kills</span></div>
                <div><strong className="red">{player.deaths}</strong><span>Morts</span></div>
                <div><strong>{kd}</strong><span>KD</span></div>
                <div><strong>{winrate}%</strong><span>WR</span></div>
              </div>

              <div className="fightAnalyticsGrid">
                <FightTrendChart
                  analytics={fightAnalytics}
                  onFightSelect={openFightFromGraph}
                />

                <div className="analyticsSideStack">
                  <FightTimeline
                    analytics={fightAnalytics}
                    onFightSelect={openFightFromGraph}
                  />
                  <FightDistribution
                    analytics={fightAnalytics}
                    weaponStats={weaponStats}
                  />
                </div>
              </div>

              <DailySilverHistoryChart fights={fights} />
            </section>
          )}

          {tab === 'weapons' && (
            <WeaponDeepStatsTab
              weapons={weaponDeepStats}
              onFightSelect={openFightFromGraph}
              onWeaponSelect={onWeaponSelect}
            />
          )}
        </section>
      </section>

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  )
}
