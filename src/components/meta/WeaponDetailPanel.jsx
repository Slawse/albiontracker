import { useState } from 'react'
import { cleanItemName, getItemImage } from '../../utils/items'

const BUILD_GRID = [
  'Bag',
  'Head',
  'Cape',
  'Weapon',
  'Armor',
  'OffHand',
  'Potion',
  'Shoes',
  'Food',
  'EmptyLeft',
  'Mount',
  'EmptyRight',
]

function getBuildItem(build, slot) {
  return build.items.find((item) => item.slot === slot)
}

function getItemQuality(item) {
  return Number(item?.quality || item?.Quality || 1)
}

function getItemCount(item) {
  return Number(item?.count || item?.Count || 1)
}

function getQualityLabel(quality) {
  const labels = {
    1: 'Normal',
    2: 'Bon',
    3: 'Remarquable',
    4: 'Excellent',
    5: "Chef-d'oeuvre",
  }

  return labels[quality] || 'Normal'
}

function getItemTypeLabel(itemId = '', fallback = '') {
  if (fallback === 'Weapon') return 'Arme'
  if (fallback === 'Head' || itemId.includes('HEAD_')) return 'Casque'
  if (fallback === 'Armor' || itemId.includes('ARMOR_')) return 'Armure'
  if (fallback === 'Shoes' || itemId.includes('SHOES_')) return 'Bottes'
  if (fallback === 'Cape' || itemId.includes('CAPE')) return 'Cape'
  if (fallback === 'OffHand' || itemId.includes('OFF_')) return 'Main gauche'
  if (fallback === 'Potion' || itemId.includes('POTION_')) return 'Potion'
  if (fallback === 'Food' || itemId.includes('MEAL_')) return 'Nourriture'
  if (fallback === 'Bag' || itemId.includes('BAG_')) return 'Sac'
  if (fallback === 'Mount' || itemId.includes('MOUNT_')) return 'Monture'

  return 'Item'
}

function parseItemInfo(item = {}) {
  const itemId = item.itemId || item.Type || item.type || ''
  const tier = itemId.match(/^T(\d+)/i)?.[1] || '-'
  const enchant = itemId.match(/@(\d+)/)?.[1] || '0'
  const quality = getItemQuality(item)

  return {
    id: itemId,
    image: getItemImage(itemId),
    name: item.name || cleanItemName(itemId),
    type: getItemTypeLabel(itemId, item.slot),
    slot: item.slot || '-',
    tier,
    enchant,
    quality,
    qualityLabel: getQualityLabel(quality),
    count: getItemCount(item),
  }
}

function ItemInfoModal({ item, onClose }) {
  if (!item) return null

  const info = parseItemInfo(item)

  return (
    <div className="weaponItemModalOverlay" onClick={onClose}>
      <div className="weaponItemModal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="weaponItemModalClose" onClick={onClose}>
          x
        </button>

        <div className="weaponItemModalTop">
          <img src={info.image} alt={info.name} />

          <div>
            <h2>
              T{info.tier}
              {info.enchant !== '0' ? `.${info.enchant}` : ''} {info.name}
            </h2>

            <div className="weaponItemModalTags">
              <span>{info.type}</span>
              <span>Tier {info.tier}</span>
              <span>Enchant +{info.enchant}</span>
              <span>{info.qualityLabel}</span>
              {info.count > 1 && <span>x{info.count}</span>}
            </div>
          </div>
        </div>

        <div className="weaponItemModalStats">
          <div>
            <small>ID Albion</small>
            <strong>{info.id}</strong>
          </div>

          <div>
            <small>Type</small>
            <strong>{info.type}</strong>
          </div>

          <div>
            <small>Qualite</small>
            <strong>{info.qualityLabel}</strong>
          </div>

          <div>
            <small>Quantite</small>
            <strong>x{info.count}</strong>
          </div>
        </div>

        <div className="weaponItemModalDescription">
          <h3>Description</h3>
          <p>
            Item observe dans les builds API. Les sorts, passifs et statistiques
            detaillees pourront etre affiches ici quand une base d'items Albion
            complete sera connectee.
          </p>
        </div>
      </div>
    </div>
  )
}

function WeaponBuildRow({ build, weapon, active, onSelect, onItemClick }) {
  return (
    <button
      type="button"
      className={active ? 'weaponBuildRow activeBuildRow' : 'weaponBuildRow'}
      onClick={() => onSelect(build.key)}
    >
      <div className="weaponBuildItems">
        <img
          src={getItemImage(weapon.itemId)}
          alt={weapon.name}
          onClick={(event) => {
            event.stopPropagation()
            onItemClick({ slot: 'Weapon', itemId: weapon.itemId, name: weapon.name })
          }}
        />
        {build.items.map((item) => (
          <img
            key={`${build.key}-${item.slot}`}
            src={getItemImage(item.itemId)}
            alt={item.name}
            onClick={(event) => {
              event.stopPropagation()
              onItemClick(item)
            }}
          />
        ))}
      </div>

      <div className="weaponBuildStats">
        <div><span>WR</span><strong className="green">{build.winrate}</strong></div>
        <div><span>Fights</span><strong>{build.fightsLabel}</strong></div>
        <div><span>Pop.</span><strong className="blue">{build.popularity}</strong></div>
      </div>
    </button>
  )
}

function BuildGearGrid({ build, weapon, onItemClick }) {
  return (
    <div className="buildGearGrid">
      {BUILD_GRID.map((slot) => {
        if (slot.startsWith('Empty')) {
          return <div className="buildGearSlot emptyBuildSlot" key={slot} />
        }

        const item =
          slot === 'Weapon'
            ? { slot, itemId: weapon.itemId, name: weapon.name }
            : getBuildItem(build, slot)

        return (
          <button
            type="button"
            className="buildGearSlot"
            key={slot}
            onClick={() => item && onItemClick(item)}
            disabled={!item}
          >
            {item ? (
              <>
                <img src={getItemImage(item.itemId)} alt={item.name} />
                <span>{slot}</span>
              </>
            ) : (
              <span>{slot}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function BuildVariantPanel({ variants = [], onItemClick }) {
  if (!variants.length) {
    return (
      <div className="buildVariantPanel">
        <strong>Variantes</strong>
        <p>Pas assez de variantes visibles sur ce build.</p>
      </div>
    )
  }

  return (
    <div className="buildVariantPanel">
      <strong>Variantes jouees</strong>

      <div className="buildVariantGroups">
        {variants.map((group) => (
          <div className="buildVariantGroup" key={group.slot}>
            <span>{group.label}</span>

            {group.rows.map((row) => (
              <button
                type="button"
                className="buildVariantRow"
                key={`${group.slot}-${row.itemId}`}
                onClick={() => onItemClick(row)}
              >
                <img src={getItemImage(row.itemId)} alt={row.name} />
                <div>
                  <b>{row.name}</b>
                  <small>{row.fightsLabel} fights - {row.popularity}</small>
                </div>
                <strong>{row.winrate}</strong>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatFightTime(value) {
  if (!value) return 'Date inconnue'

  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function BuildRecentFights({ fights = [] }) {
  if (!fights.length) {
    return (
      <div className="buildRecentFights">
        <strong>Derniers fights</strong>
        <p>Pas assez de fights recents avec ce stuff.</p>
      </div>
    )
  }

  return (
    <div className="buildRecentFights">
      <div className="buildRecentHeader">
        <strong>Derniers fights avec ce stuff</strong>
        <span>{fights.length} recents</span>
      </div>

      <div className="buildRecentList">
        {fights.map((fight) => (
          <div className={`buildRecentRow ${fight.result}`} key={`${fight.eventId}-${fight.player}`}>
            <div className="buildRecentResult">
              <b>{fight.result === 'kill' ? 'Kill' : 'Mort'}</b>
              <span>{formatFightTime(fight.time)}</span>
            </div>

            <div className="buildRecentNames">
              <strong>{fight.player}</strong>
              <span>vs {fight.opponent}</span>
            </div>

            <div className="buildRecentWeaponSlot">
              {fight.opponentWeapon ? (
                <img
                  src={getItemImage(fight.opponentWeapon)}
                  alt={fight.opponentWeaponName}
                  title={fight.opponentWeaponName}
                />
              ) : (
                <span>-</span>
              )}
            </div>

            <div className="buildRecentMeta">
              <strong>{fight.fame}</strong>
              <span>{fight.content}{fight.itemPower ? ` - ${fight.itemPower} IP` : ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SelectedBuildDetails({ build, weapon, onItemClick }) {
  if (!build) return null

  return (
    <div className="selectedBuildWrap">
      <div className="selectedBuildDetails">
        <div className="selectedBuildGear">
          <div className="selectedBuildTitle">
            <strong>Stuff regroupe</strong>
            <span>{build.fightsLabel} fights - {build.winrate} WR</span>
          </div>

          <BuildGearGrid build={build} weapon={weapon} onItemClick={onItemClick} />
        </div>

        <BuildVariantPanel variants={build.variants || []} onItemClick={onItemClick} />
      </div>

      <BuildRecentFights fights={build.recentFights || []} />
    </div>
  )
}

function WeaponTrendChart({ trend = [] }) {
  const rows = trend.length ? trend : []
  const values = rows.map((row) => Number(row.winrate || 0))
  const fights = rows.map((row) => Number(row.fights || 0))
  const width = 520
  const height = 180
  const padX = 20
  const padY = 22
  const graphWidth = width - padX * 2
  const graphHeight = 104
  const maxFights = Math.max(...fights, 1)
  const last = rows[rows.length - 1] || {}
  const totalFights = fights.reduce((sum, value) => sum + value, 0)
  const totalWins = rows.reduce((sum, row) => sum + Number(row.wins || 0), 0)
  const totalWr = totalFights ? Math.round((totalWins / totalFights) * 100) : 0

  const points = values.map((value, index) => {
    const x = padX + (index / Math.max(values.length - 1, 1)) * graphWidth
    const y = padY + graphHeight - (value / 100) * graphHeight

    return { x, y, value }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padY + graphHeight} L ${points[0].x} ${padY + graphHeight} Z`
    : ''

  return (
    <div className="weaponTrendChart">
      <div className="weaponTrendChartTop">
        <div>
          <strong>Tendance recente</strong>
          <span>Winrate et volume par tranche</span>
        </div>

        <div className="weaponTrendSummary">
          <div><span>WR</span><b>{totalWr}%</b></div>
          <div><span>Fights</span><b>{totalFights.toLocaleString('fr-FR')}</b></div>
          <div><span>Dernier</span><b>{Number(last.winrate || 0)}%</b></div>
        </div>
      </div>

      <svg className="weaponTrendSvg" viewBox={`0 0 ${width} ${height}`}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padY + graphHeight - (tick / 100) * graphHeight

          return (
            <g key={tick}>
              <line className="weaponTrendGrid" x1={padX} x2={width - padX} y1={y} y2={y} />
              <text className="weaponTrendTick" x="2" y={y + 4}>{tick}%</text>
            </g>
          )
        })}

        {areaPath && <path className="weaponTrendArea" d={areaPath} />}
        {linePath && <path className="weaponTrendLine" d={linePath} />}

        {points.map((point, index) => (
          <circle
            className="weaponTrendPoint"
            key={`${point.x}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
          />
        ))}

        {rows.map((row, index) => {
          const barWidth = Math.max(graphWidth / Math.max(rows.length, 1) - 10, 10)
          const barHeight = (Number(row.fights || 0) / maxFights) * 34
          const x = padX + (index / Math.max(rows.length - 1, 1)) * graphWidth - barWidth / 2
          const y = height - 20 - barHeight

          return (
            <rect
              className={Number(row.wins || 0) >= Number(row.losses || 0) ? 'weaponTrendBar good' : 'weaponTrendBar bad'}
              key={`${row.label}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 4)}
              rx="5"
            />
          )
        })}
      </svg>
    </div>
  )
}

function WeaponMatchupList({ title, rows = [], tone }) {
  return (
    <div className={`weaponMatchupBox ${tone}`}>
      <strong>{title}</strong>

      <div className="weaponMatchupRows">
        {rows.map((row) => (
          <div className="weaponMatchupRow" key={row.baseId}>
            <img src={getItemImage(row.itemId)} alt={row.name} />
            <div>
              <span>{row.name}</span>
              <small>{row.fightsLabel} fights</small>
            </div>
            <b>{row.winrate}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WeaponDetailPanel({ detail, loading, onBack }) {
  const [selectedBuildKey, setSelectedBuildKey] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)

  if (loading) {
    return (
      <section className="weaponDetailPanel">
        <button type="button" className="weaponBackButton" onClick={onBack}>
          Retour meta
        </button>
        <div className="weaponMetaEmpty">Chargement du detail arme...</div>
      </section>
    )
  }

  if (!detail) {
    return (
      <section className="weaponDetailPanel">
        <button type="button" className="weaponBackButton" onClick={onBack}>
          Retour meta
        </button>
        <div className="weaponMetaEmpty">Impossible de charger cette arme.</div>
      </section>
    )
  }

  const builds = detail.builds || []
  const tiers = detail.tiers || []
  const selectedBuild =
    builds.find((build) => build.key === selectedBuildKey) ||
    builds[0] ||
    null

  return (
    <section className="weaponDetailPanel">
      <div className="weaponDetailTopbar">
        <button type="button" className="weaponBackButton" onClick={onBack}>
          Retour meta
        </button>
        <span>Meta armes du moment / {detail.name}</span>
      </div>

      <div className="weaponDetailHero">
        <div className="weaponDetailIdentity">
          <img src={getItemImage(detail.itemId)} alt={detail.name} />
          <div>
            <h3>{detail.name}</h3>
            <p>{detail.type} - Global tous tiers</p>
          </div>
        </div>

        <div className="weaponDetailStats">
          <div><span>WR</span><strong className="green">{detail.winrate}</strong></div>
          <div><span>Pickrate</span><strong className="blue">{detail.pickrate}</strong></div>
          <div><span>Fights</span><strong>{detail.fightsLabel}</strong></div>
          <div><span>KD</span><strong>{detail.kd}</strong></div>
        </div>
      </div>

      <div className="weaponDetailGrid">
        <div className="weaponBuildsPanel">
          <div className="weaponPanelTitle">
            <strong>Builds observes</strong>
            <span>{detail.minBuildNote}</span>
          </div>

          {builds.length > 0 ? (
            <>
              {builds.map((build) => (
                <WeaponBuildRow
                  key={build.key}
                  build={build}
                  weapon={detail}
                  active={selectedBuild?.key === build.key}
                  onSelect={setSelectedBuildKey}
                  onItemClick={setSelectedItem}
                />
              ))}

              <SelectedBuildDetails
                build={selectedBuild}
                weapon={detail}
                onItemClick={setSelectedItem}
              />
            </>
          ) : (
            <div className="weaponMetaEmpty">Pas assez de volume pour sortir un build fiable</div>
          )}
        </div>

        <div className="weaponMatchupsPanel">
          <WeaponMatchupList title="Counters" rows={detail.counters || []} tone="bad" />
          <WeaponMatchupList title="Bons matchups" rows={detail.goodMatchups || []} tone="good" />
        </div>
      </div>

      <div className="weaponStatsPanel">
        <div className="weaponPanelTitle">
          <strong>Stats globales</strong>
          <span>Tous tiers et enchantements fusionnes</span>
        </div>

        <div className="weaponGlobalStats">
          <WeaponTrendChart trend={detail.trend || []} />

          <div className="weaponTierTable">
            {tiers.map((row) => (
              <div className="weaponTierRow" key={row.tier}>
                <strong>{row.tier}</strong>
                <span>{row.fightsLabel} fights</span>
                <span className="green">{row.winrate}</span>
                <span className="blue">{row.pickrate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ItemInfoModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  )
}
