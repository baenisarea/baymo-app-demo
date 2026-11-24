# Baymo · App Demo (website)

An interactive web demo of the Baymo iOS app, synced with the ECG-main-2 source.
It uses a fictional child and simulated data. The vest, Bluetooth and ECG are simulated, and Baymo does not diagnose.

It is a static site: plain HTML, CSS and JavaScript. It needs no build step, no server code and no database.
It is designed for a 1920 × 1080 screen and scales to fit smaller windows.

## Put it online

**Netlify Drop (no account set-up, about 1 minute)**
1. Go to https://app.netlify.com/drop
2. Drag the whole `baymo-app-demo` folder onto the page.
3. You get a public link such as `https://<random-name>.netlify.app`. Rename it in Site settings if you like.

**GitHub Pages**
1. Create a new repository and upload the contents of this folder: `index.html` must be at the top level.
2. In the repository, go to Settings › Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`.
3. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.

**Any web host**
Upload the folder's contents to the host's public folder, for example `public_html`.

## Open it on your own computer
Some browsers block parts of a page that is opened straight from a file. To preview it locally, serve the folder instead:

    cd baymo-app-demo
    python3 -m http.server 8000

Then open http://localhost:8000

## What's inside
- `index.html`: the page, with the guide column on the left and the phone on the right
- `css/`, `js/`: the app screens, rebuilt from the Swift source
- `assets/`: illustrations, animations and the app mark
