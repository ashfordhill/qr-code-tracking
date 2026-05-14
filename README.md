# qr-code-tracking


![](.docs/labels-scans-cumulative.svg)

- [qr-code-tracking](#qr-code-tracking)
  - [Privatized](#privatized)
  - [Design](#design)
  - [2026](#2026)
    - [Engagement Notes](#engagement-notes)
    - [Software](#software)
      - [Improvement Ideas](#improvement-ideas)
    - [Hardware](#hardware)
    - [Deployment Notes](#deployment-notes)
      - [Process](#process)
        - [Prepping Posters](#prepping-posters)
        - [Installing Posters](#installing-posters)
      - [Funnest Install](#funnest-install)
      - [QR Scanning Competitors?!](#qr-scanning-competitors)
      - [Poster Printing Service Comparison](#poster-printing-service-comparison)
  - [2025](#2025)
    - [Hardware](#hardware-1)
  - [Also See](#also-see)

## Privatized

**⚠️is now documentation-only repo⚠️**

The src code for this project and Cloudflare worker deployments live in a private repo dedicated to tracking my neighborhood's stuff under a specific domain. 

## Design 

![](.docs/pi-to-server-v2.svg)

![](.docs/server-db-to-metrics.svg)

## 2026

### Engagement Notes

- First scan came within an hour after first poster install! I was pleased. It made me want to install more posters.
- The average person is going to interact with a poster a max of 1 time. There is no need to complete the tree form more than once.
  - Therefore, I expect to see less traffic over time once every poster is in place (May/June having higher engagement than August/September).
- It's unlikely people driving cars would stop to engage with my small posters. Posters should face sidewalks for pedestrians, not streets for cars.
- I expect that bus stops will be a hotter area since pedestrians need to wait around.
- People autopilot around and probably become blind to flyers in usual spots. Looking for novel spots while keeping out of trouble.
  - Maybe I could print posters with an obnoxious-colored border next time?
- Older people probably don't know how to use QR codes.

### Software

![](.docs/2026-engagement.gif)

#### Improvement Ideas

- A way to delete slugs on my 'QR print button' site. For instance I accidentally pressed the print button with my phone once. Would be nice to rm from database while on the field.
- A way to mark a poster as 'missing' or 'uninstalled', via the viewer. Prob need to modify the DB schema for that. 
- Have circle size on map viewer grow by relative scan count; larger dots would mean more engagement and I don't have to use list view or click around to see my most popular posters.
  - Differentiate posters with 0 scans by color (like grey), on the map viewer. 

### Hardware

<br>
<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/raspberry-pi-nes.JPG" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Raspberry Pi needed housing to avoid damage on the move</em></div>
<br>
<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/hardware-bundle-2026.jpg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>All the components together. Using a portable power bank for Pi + printer.</em></div>
<br>
<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/backpack.jpeg" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>Everything in backpack. ~12lbs total.</em></div>

### Deployment Notes

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/2026-poster-installed.jpeg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Installed poster with the QR sticker + city stamp applied.</em></div>
<br>

#### Process

##### Prepping Posters

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/finished-laminating.jpg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>All done! 12 groups of 10.</em></div>
<br>

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/slow-lamination.gif" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Ultra fast lamination. Thanks Amazon.</em></div>
<br>

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/tape-back-posters.JPG" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Pre-install with double-sided adhesive. Way easier than bringing tape on 'the field'. Also looks nicer.</em></div>
<br>

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/berwyn-stamp.jpg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Had a stamp made to make things look official-like and scare anyone off from touching my posters (‼️). Used a version with the mayor's name to appeal to him in case there are issues. Everyone likes a lil ego stroking, yknow?</em></div>
<br>


##### Installing Posters

- grab poster
  - print QR label sticker
    - attach sticker 
      - remove adhesive backing on poster
        - place poster
          - stamp poster
            - pack up to next location


I didn't experience any bugs.

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/hotspot-pi-connected.jpg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Before heading out, I turn Pi on/off and wait to see hotspot connected. Takes around 30 seconds.</em></div>
<br>


#### Funnest Install

Really gets the message across (the tree is dead).

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/2026-poster-install-dead-tree.JPG" width="400" style="margin:0 8px;" />
</div>

#### QR Scanning Competitors?!

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/someone-else-advertising-with-qr.jpg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Someone else could prob use some fancier posters to advertise their business. Rain has been crazy this year. Also the design could use some love; this almost looks like an invoice.</em></div>
<br>

#### Poster Printing Service Comparison

| Provider | Year | Material | Cost (pre-tax, pre-shipping) | Quantity | Notes |
|----------|------|----------|------------------------------|----------|-------|
| UPrinting | 2026 | 14 pt. Cardstock Gloss | $56.52 | 100 | Included 20 extras |
| NextDayFlyers | 2025 | 100 lb. Paper w/ Gloss | $32.92 | 50 | |

> UPrinting definitely wins this one. The 14 pt. cardstock was thicker and higher-end feeling. It was their cheapest option. Also the 20 freebies was 👌

## 2025

### Hardware

I thought I could use this [thermal receipt printer](https://www.ebay.com/itm/226867836141). The printer has to be able to print via commands from Linux. **ESC POS Command Support** is apparently the identifiable search term here.

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/chaos-setup.png" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>The setup that would be abandoned</em></div>

<br>

Unfortunately I'm a total noob with this stuff. While I was able to get a signal of successful printer recognition from the Pi, the thermal printer was supposedly undervolted. In my ignorance, ended up frying the poor thing.


<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/burnt.png" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>Burning smell followed by the above, on the thermal printer board</em></div>

<br>

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/cleaned.png" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>Tried desoldering the part where they melted together. Nope. RIP.</em></div>

<br>

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/no-gps-signal.gif" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>I thought I could get GPS coordinates via Adafruit Ultimate GPS. But you need satellite signal to get them successful. Otherwise it just waits forever. Who woulda thought; that's gonna be a problem indoors.</em></div>

<br>

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/receipts.jpg" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>Turns out the thermal receipt printer was unlikely to product good quality QR codes on adhesive paper anyway. Yay, burning money!</em></div>

<br>

For now, the design will involve utilizing my phone GPS, since I'm going to need my phone's hotspot for the Pi anyway. I also ended up using an existing, fancy label printer I happened to have access to. [Zebra printers have their own proprietary cmds through ZPL that help you generate QR codes](https://support-new.zebra.com/article/000032617).

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/zebra-pi.png" width="400" style="margin:0 8px;" />
</div>

<div align="center"><em>Not the most lightweight printer option, but useable for experimentation</em></div>

<br>

I was able to get the Pi to print via sending commands to the serial connection on the printer and printed a nice 'hello world' (no picture, RIP). And now the rest is non-complex software I'll eventually get around to vibe coding, something something server hosting. Less exciting bits.


## Also See

Checkout my [brainstorming repo](https://github.com/ashfordhill/brainstorm) for detailed information around this project.