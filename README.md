# Northstar

A resilience-mode disaster navigation prototype built with Expo and React Native.

Live demo: https://aryanbhardwaj4.github.io/cu-hackathon/

## Run locally

```sh
npm ci
npm run web
```

Open the local URL printed by Expo. The Connected, 2G / Edge, and Survival controls
demonstrate the UI's graceful-degradation states.

## Live map and data services

- OpenStreetMap provides map tiles and Nominatim place search.
- The public OSRM demo endpoint calculates driving routes.
- Browser geolocation provides the user's position after they grant permission.
- Open-Meteo provides current weather; the U.S. National Weather Service provides
  active alerts in the contiguous United States.

The user must select **Locate** to share their position with these public services.
The site does not require API keys. Public endpoints have usage policies, rate
limits, and no availability guarantee; they are intended for a prototype, not
emergency-service or high-volume production use.

## Publish with GitHub Pages

The GitHub Actions workflow builds the static Expo web app and publishes it to
GitHub Pages whenever a commit is pushed to `main`. The repository Pages setting
must use **GitHub Actions** as its build and deployment source.

## Important limitations

The app is a prototype, not an emergency service. Public-map search results are
not verified shelter listings; OSRM routes are not checked against live closures,
flooding, elevation, or official evacuation orders. Weather and alerts may be
delayed or unavailable. Hazard reports remain in this browser session and are
not sent to responders or nearby devices. The site has no offline tile cache,
Bluetooth/Wi-Fi mesh, AR, or battery-management API. Verify routes and shelter
availability with local authorities.
