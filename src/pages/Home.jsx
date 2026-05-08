import { useEffect, useState } from 'react'
import '../styles/home.css'
import { getHomeMeta } from '../api/albionApi'
import { getItemImage } from '../utils/items'
import MiniSparkline from '../components/meta/MiniSparkline'

const FALLBACK_WEAPONS = [
  {
    rank: 1,
    name: 'Bloodletter',
    type: 'Dagues',
    winrate: '59.4%',
    pickrate: '18.7%',
    fightsLabel: '2 342',
    tier: 'S',
    itemId: 'T6_MAIN_RAPIER_MORGANA',
    trend: [8, 10, 12, 15, 14, 18, 20, 17, 21, 23, 22, 25],
  },
  {
    rank: 2,
    name: 'Dagger Pair',
    type: 'Dagues',
    winrate: '58.2%',
    pickrate: '14.3%',
    fightsLabel: '1 786',
    tier: 'S',
    itemId: 'T6_2H_DAGGERPAIR',
    trend: [7, 9, 8, 11, 10, 13, 18, 15, 14, 20, 21, 24],
  },
  {
    rank: 3,
    name: 'Carving Sword',
    type: 'Epees',
    winrate: '55.1%',
    pickrate: '11.4%',
    fightsLabel: '1 420',
    tier: 'A',
    itemId: 'T6_2H_CLEAVER_HELL',
    trend: [5, 6, 10, 9, 14, 11, 16, 12, 14, 19, 18, 21],
  },
  {
    rank: 4,
    name: 'Cursed Staff',
    type: 'Maudit',
    winrate: '54.7%',
    pickrate: '9.8%',
    fightsLabel: '1 210',
    tier: 'A',
    itemId: 'T6_MAIN_CURSEDSTAFF',
    danger: true,
    trend: [18, 16, 13, 12, 11, 14, 12, 13, 10, 14, 13, 12],
  },
]

function formatSample(value) {
  return Number(value || 0).toLocaleString('fr-FR')
}

function getRelativeUpdate(dateValue) {
  if (!dateValue) return 'maintenant'

  const diff = Date.now() - new Date(dateValue).getTime()
  const minutes = Math.max(Math.round(diff / 60000), 0)

  if (minutes <= 1) return 'il y a 1 min'
  if (minutes < 60) return `il y a ${minutes} min`

  return `il y a ${Math.round(minutes / 60)} h`
}

function MetaWeaponCard({ weapon, onSelect }) {
  return (
    <button
      type="button"
      className="homeMetaWeaponCard"
      onClick={() => onSelect?.(weapon)}
    >
      <div className="homeMetaRankWrap">
        <div className={`homeRankBadge rank-${weapon.rank}`}>{weapon.rank}</div>
      </div>

      <div className="homeMetaWeaponMain">
        <img
          className="homeMetaWeaponIcon"
          src={getItemImage(weapon.itemId)}
          alt={weapon.name}
        />

        <div className="homeMetaWeaponText">
          <h3>{weapon.name}</h3>
          <p>{weapon.type}</p>
        </div>
      </div>

      <div className={`homeTierBadge tier-${weapon.tier}`}>{weapon.tier}</div>

      <div className="homeMetaNumbers">
        <div>
          <span>Winrate</span>
          <strong className="green">{weapon.winrate}</strong>
        </div>

        <div>
          <span>Pickrate</span>
          <strong className="blue">{weapon.pickrate}</strong>
        </div>
      </div>

      <div className="homeMetaBottom">
        <span>Fights</span>
        <strong>{weapon.fightsLabel || weapon.fights}</strong>
      </div>

      <div className="homeMetaSpark">
        <MiniSparkline
          points={(weapon.trend || []).map((bucket) =>
            typeof bucket === 'number' ? bucket : bucket.fights
          )}
          danger={weapon.danger}
        />
      </div>
    </button>
  )
}

function HomeMetaTrendBoard({ weapons = [] }) {
  const maxTrend = Math.max(
    ...weapons.flatMap((weapon) =>
      (weapon.trend || []).map((bucket) =>
        typeof bucket === 'number' ? bucket : Number(bucket.fights || 0)
      )
    ),
    1
  )

  function getBucketValue(bucket) {
    return typeof bucket === 'number' ? bucket : Number(bucket.fights || 0)
  }

  function getBucketTone(bucket) {
    if (typeof bucket === 'number') return 'neutral'
    if (!bucket.fights) return 'empty'
    return bucket.wins >= bucket.losses ? 'good' : 'bad'
  }

  return (
    <aside className="homeTrendBoard">
      <div className="homeTrendHeader">
        <div>
          <strong>Tendance 24h</strong>
          <span>Base API, tranches de 2h</span>
        </div>
      </div>

      <p>Volume recent, winrate recent et evolution vs les 24h precedentes.</p>

      <div className="homeTrendRows">
        {weapons.map((weapon) => (
          <div className="homeTrendRow" key={weapon.itemId || weapon.name}>
            <img src={getItemImage(weapon.itemId)} alt={weapon.name} />

            <div className="homeTrendWeapon">
              <strong>{weapon.name}</strong>
              <span>{weapon.recentFightsLabel || weapon.fightsLabel} fights 24h</span>
            </div>

            <div className="homeTrendMetric">
              <span>WR 24h</span>
              <strong>{weapon.recentWinrate || weapon.winrate}</strong>
            </div>

            <div className="homeTrendBars">
              {(weapon.trend || []).map((bucket, index) => {
                const value = getBucketValue(bucket)

                return (
                  <span
                    key={index}
                    className={`homeBar ${getBucketTone(bucket)}`}
                    title={`${value} fights`}
                    style={{
                      height: `${Math.max((value / maxTrend) * 34, value ? 10 : 4)}px`,
                      opacity: Math.max(value / maxTrend, 0.24),
                    }}
                  />
                )
              })}
            </div>

            <strong
              className={
                Number(weapon.trendDeltaNumber || 0) >= 0
                  ? 'homeTrendDelta positive'
                  : 'homeTrendDelta negative'
              }
            >
              {weapon.trendDelta || '+0.0%'}
            </strong>
          </div>
        ))}
      </div>
    </aside>
  )
}

function HomeMetaSection({ onWeaponSelect }) {
  const [meta, setMeta] = useState({
    weapons: FALLBACK_WEAPONS,
    sampleSize: 0,
    updatedAt: null,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadMeta() {
      setLoading(true)

      try {
        const data = await getHomeMeta()

        if (!cancelled) {
          setMeta({
            weapons: data.weapons || [],
            sampleSize: data.sampleSize || 0,
            updatedAt: data.updatedAt,
          })
        }
      } catch (error) {
        console.warn('Meta accueil indisponible:', error)

        if (!cancelled) {
          setMeta((current) => ({
            ...current,
            weapons: FALLBACK_WEAPONS,
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadMeta()

    return () => {
      cancelled = true
    }
  }, [])

  const displayedWeapons = meta.weapons.length ? meta.weapons : FALLBACK_WEAPONS

  return (
    <section className="homeMetaPanel">
      <div className="homeMetaPanelTop">
        <div>
          <h2>Meta armes du moment</h2>
          <p>Meilleur winrate avec pickrate minimum</p>
        </div>
      </div>

      <div className="homeMetaContent">
        <div className="homeMetaWeaponsGrid">
          {displayedWeapons.map((weapon) => (
            <MetaWeaponCard
              key={weapon.itemId || weapon.name}
              weapon={weapon}
              onSelect={onWeaponSelect}
            />
          ))}
        </div>

        <HomeMetaTrendBoard weapons={displayedWeapons} />
      </div>

      <div className="homeMetaFooter">
        <span>
          Derniere mise a jour : {loading ? 'chargement...' : getRelativeUpdate(meta.updatedAt)}
        </span>
        <span>Echantillon : {formatSample(meta.sampleSize)} fights</span>
      </div>
    </section>
  )
}

export default function Home({ onSearch, loading, onWeaponSelect }) {
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState(false)
  const [homeMeta, setHomeMeta] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      try {
        const data = await getHomeMeta()
        if (!cancelled) setHomeMeta(data)
      } catch (error) {
        console.warn('Stats accueil indisponibles:', error)
      }
    }

    loadSummary()

    return () => {
      cancelled = true
    }
  }, [])

  function submit() {
    if (!query.trim() || loading) return
    onSearch(query)
  }

  return (
    <main className="hero">
      <h1>
        ALBION
        <span>TRACKER</span>
      </h1>

      <p className="subtitle">
        RECHERCHE JOUEUR - STATS PVP - BUILDS - META
      </p>

      <div className={`search ${focus ? 'focus' : ''}`}>
        <div className="searchIcon">?</div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ex: slaw, xernon, chukak ou vrai pseudo Albion"
          disabled={loading}
        />

        <button onClick={submit} disabled={loading}>
          {loading ? 'CHARGEMENT...' : 'RECHERCHER ->'}
        </button>
      </div>

      <section className="stats">
        <div className="stat">
          <small>KILLS AUJOURD'HUI</small>
          <strong>{homeMeta?.summary?.todayKills || '0'}</strong>
          <span>{homeMeta?.summary?.todayKillsDelta || '0%'}</span>
        </div>

        <div className="stat">
          <small>JOUEURS ACTIFS</small>
          <strong>{homeMeta?.summary?.activePlayers || '0'}</strong>
          <span>{homeMeta?.summary?.activePlayersDelta || '0%'}</span>
        </div>

        <div className="stat">
          <small>GUILDES CLASSEES</small>
          <strong>{homeMeta?.summary?.guilds || '0'}</strong>
          <span>{homeMeta?.summary?.guildsDelta || '0%'}</span>
        </div>

        <div className="stat">
          <small>VERSION</small>
          <strong>{homeMeta?.summary?.version || 'Live'}</strong>
          <span>Live</span>
        </div>
      </section>

      <HomeMetaSection onWeaponSelect={onWeaponSelect} />
    </main>
  )
}
