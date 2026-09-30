# Northstar

An offline-first disaster evacuation UI prototype built with Expo and React Native.

Live demo: https://aryanbhardwaj4.github.io/cu-hackathon/

## Run locally

```sh
npm ci
npm run web
```

Open the local URL printed by Expo. The Connected, 2G / Edge, and Survival controls
demonstrate the UI's graceful-degradation states.

## Publish with GitHub Pages

The GitHub Actions workflow builds the static Expo web app and publishes it to
GitHub Pages whenever a commit is pushed to `main`. The repository Pages setting
must use **GitHub Actions** as its build and deployment source.

## Prototype limitations

Network tiers, battery levels, alerts, routes, shelters, GPS coordinates, offline
maps, and hazard reports are demonstration data. The prototype does not access
AR, device GPS, offline map storage, or a Bluetooth/Wi-Fi mesh, and it must not
be used as emergency guidance.
