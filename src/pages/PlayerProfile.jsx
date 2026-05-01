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
    if (items.length === 0) {
      setTotalPrice(null)
      setPricedCount(0)
      setItemCount(0)
      return
    }

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
  }, [priceKey, items.length])

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

export default function PlayerProfile({ player, onPlayerSearch }) {
  const [tab, setTab] = useState('overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    setTab('overview')
    setCurrentPage(1)
    setSelectedItem(null)
  }, [player?.name])

  if (!player) return null

  const fights = player.fights || []
  const weaponStats = getWeaponStatsFromFights(fights)

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
                <div className="weaponPerfRow" key={weapon.weapon}>
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
                </div>
              ))
            ) : (
              <p className="emptyWeaponStats">Aucune arme trouvée</p>
            )}
          </div>

          <div className="sideStats">
            <div><small>PvP</small><strong>{player.pvp}</strong></div>
            <div><small>PvE</small><strong>{player.pve}</strong></div>
            <div><small>Récolte</small><strong>{player.gathering}</strong></div>
            <div><small>Fabrication</small><strong>{player.crafting}</strong></div>
            <div><small>Infamie</small><strong>{player.infamy}</strong></div>
            <div><small>Hellgate</small><strong>{player.hellgate}</strong></div>
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
                  <details className={`matchRow ${fight.type}`} key={fight.id}>
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
                          <span>{fight.zone}</span>
                        </div>
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
            </section>
          )}
        </section>
      </section>

      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  )
}