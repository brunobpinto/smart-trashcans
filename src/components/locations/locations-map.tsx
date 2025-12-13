"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"
import { env } from "~/env"

export type TrashcanLocation = {
  id: string
  name: string
  location: string | null
  description: string | null
  latitude: number
  longitude: number
  binType: string
  capacityPct: number | null
}

// Get color based on capacity percentage
function getCapacityColor(capacityPct: number | null): string {
  if (capacityPct == null) return "#9ca3af" // gray for unknown
  if (capacityPct < 33) return "#86efac" // green pastel (green-300)
  if (capacityPct < 66) return "#fde047" // yellow pastel (yellow-300)
  return "#fca5a5" // red pastel (red-300)
}

interface LocationsMapProps {
  trashcans: TrashcanLocation[]
}

// Default center (PUC-Rio coordinates)
const defaultCenter = {
  lat: -22.9753,
  lng: -43.2256,
}

const defaultZoom = 18

// Track if options have been set
let optionsInitialized = false

export function LocationsMap({ trashcans }: LocationsMapProps) {
  const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Calculate center based on trashcans or use default
  const center = useMemo(() => {
    if (trashcans.length === 0) {
      return defaultCenter
    }

    const validTrashcans = trashcans.filter(
      (t) => t.latitude != null && t.longitude != null
    )

    if (validTrashcans.length === 0) {
      return defaultCenter
    }

    const avgLat =
      validTrashcans.reduce((sum, t) => sum + t.latitude, 0) /
      validTrashcans.length
    const avgLng =
      validTrashcans.reduce((sum, t) => sum + t.longitude, 0) /
      validTrashcans.length

    return { lat: avgLat, lng: avgLng }
  }, [trashcans])

  // Create info window content
  const createInfoWindowContent = useCallback((trashcan: TrashcanLocation) => {
    const isRecycle = trashcan.binType === "RECYCLE"
    const capacityText = trashcan.capacityPct != null 
      ? `${trashcan.capacityPct.toFixed(0)}%` 
      : "N/A"
    return `
      <style>
        .trashcan-link:hover { text-decoration: underline !important; }
        .gm-style-iw-chr { position: absolute !important; top: 4px !important; right: 4px !important; height: auto !important; }
        .gm-style-iw-d { overflow: visible !important; }
        .gm-style-iw { padding: 0 !important; }
      </style>
      <div style="padding: 20px 28px 20px 20px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="color: ${isRecycle ? "#10b981" : "#3b82f6"}; font-size: 14px;">
            ${isRecycle ? "♻️" : "🗑️"}
          </span>
          <a href="/trashcans/${trashcan.id}" class="trashcan-link" style="font-weight: 700; font-size: 14px; margin: 0; color: #000000; text-decoration: none;">
            ${trashcan.name}
          </a>
        </div>
        ${trashcan.location ? `<p style="font-size: 12px; color: #666; margin: 0 0 4px 0;">${trashcan.location}</p>` : ""}
        ${trashcan.description ? `<p style="font-size: 12px; color: #666; margin: 0;">${trashcan.description}</p>` : ""}
        <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">
          Tipo: ${isRecycle ? "Reciclagem" : "Comum"}
        </p>
        <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">
          Capacidade: ${capacityText}
        </p>
      </div>
    `
  }, [])

  // Load Google Maps API using the new functional API
  useEffect(() => {
    if (!apiKey) return

    const loadMap = async () => {
      try {
        // Set options only once
        if (!optionsInitialized) {
          setOptions({
            key: apiKey,
            v: "weekly",
          })
          optionsInitialized = true
        }

        // Import the maps library
        await importLibrary("maps")
        setIsLoaded(true)
      } catch (err) {
        console.error("Error loading Google Maps:", err)
        setLoadError("Erro ao carregar o Google Maps")
      }
    }

    void loadMap()
  }, [apiKey])

  // Initialize map once loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: defaultZoom,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
    })

    infoWindowRef.current = new google.maps.InfoWindow()
  }, [isLoaded, center])

  // Add/update markers when trashcans change
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // Add new markers
    trashcans.forEach((trashcan) => {
      if (trashcan.latitude == null || trashcan.longitude == null) return

      // Pin marker color based on capacity percentage
      const pinColor = getCapacityColor(trashcan.capacityPct)

      // Create smaller pin-style marker with Trash2 icon
      const pinSvg = `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <!-- Pin shape (teardrop) -->
        <path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5"/>
        <!-- Trash2 icon (scaled and centered) -->
        <g transform="translate(5, 5) scale(0.75)" stroke="#374151" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </g>
      </svg>`

      const marker = new google.maps.Marker({
        position: {
          lat: trashcan.latitude,
          lng: trashcan.longitude,
        },
        map: mapInstanceRef.current,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg),
          scaledSize: new google.maps.Size(28, 36),
          anchor: new google.maps.Point(14, 36),
        },
        title: trashcan.name,
      })

      marker.addListener("click", () => {
        if (infoWindowRef.current && mapInstanceRef.current) {
          infoWindowRef.current.setContent(createInfoWindowContent(trashcan))
          infoWindowRef.current.open(mapInstanceRef.current, marker)
        }
      })

      markersRef.current.push(marker)
    })

    // Update map center
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(center)
    }
  }, [isLoaded, trashcans, center, createInfoWindowContent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [])

  if (!apiKey) {
    return (
      <div className="flex h-[550px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-muted-foreground">
            Google Maps API key não configurada.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no arquivo .env
          </p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-[550px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-muted-foreground">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[550px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "550px",
        borderRadius: "8px",
      }}
    />
  )
}
