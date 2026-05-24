# qr-code-tracking


![](.docs/labels-scans-cumulative.svg)

- [qr-code-tracking](#qr-code-tracking)
  - [Design](#design)
  - [2026](#2026)
    - [May Update](#may-update)
      - [Metrics Site Live](#metrics-site-live)
        - [View 2022 Trees on Map](#view-2022-trees-on-map)
        - [Activity](#activity)
      - [Longevity Issues](#longevity-issues)
    - [Software](#software)
    - [Hardware](#hardware)
    - [Deployment Notes](#deployment-notes)
      - [Process](#process)
        - [Prepping Posters](#prepping-posters)
        - [Installing Posters](#installing-posters)
      - [QR Scanning Competitors?!](#qr-scanning-competitors)
      - [Poster Printing Service Comparison](#poster-printing-service-comparison)
    - [Engagement Notes](#engagement-notes)
  - [2025](#2025)
    - [Hardware](#hardware-1)
  - [Also See](#also-see)


## Design 

![](.docs/pi-to-server-v2.svg)

![](.docs/server-db-to-metrics.svg)

## 2026

### May Update

#### Metrics Site Live

- [https://metrics.trees4berwyn.org](https://metrics.trees4berwyn.org)

  - Viewing the slugs requires a password. There's no real reason to not. 


##### View 2022 Trees on Map
Added a tree overlay from [Berwyn's 2022 Tree Inventory](https://cityofberwyn.maps.arcgis.com/apps/webappviewer/index.html?id=0376e190e586494998559cfd9c04580d)

![](.docs/tree-overlay.gif)

##### Activity

Activity overlay based on scan count + experimental timeline - I want to see how engagement changes based on time/day and look for any trends. There isn't enough data for anything conclusive though. Maybe the end of the summer.

![](.docs/metrics-timeline-v1.gif)
![](.docs/activity-levels.png)

#### Longevity Issues

![](.docs/faded-label.jpg)

The sun has not been a friend during this process.

With random thunderstorms mixed with intermittent sunny days my QR labels have started to fade, mostly due to UV damage.

I've concluded that I will revisit existing posters. There are 77 installed at the time of this writing.

  - To address the sun issue I ordered ['weatherproof' direct thermal labels](https://www.onlinelabels.com/products/rl940dw?src=mp-482). On the plus side I'll no longer have to trim the label's excess off myself with scissors now that I'm going to be using 3"W x 2"L labels instead of the 4"W x 6"L labels (too much length) I inherited. Though, I really should've done the 4"W. Too late now though! Order has shipped. 📦

  - I also ordered [UV protection spray](https://www.krylon.com/en/products/clear-coatings/uv-resistant-clear-coating.html) that I'll be applying after labels.

On the software side, this means I'll need a 'replace label' feature that plays well with my metrics-viewing site.

  - Might also throw in a 'disabled/removed' feature. I've considered removing a couple posters that probably weren't great spots to begin with.

This wasn't a problem I anticipated & it's somewhat discouraging but it's a solveable problem. I'm glad I didn't install all the posters yet!

### Software

<table>
  <tr>
    <td align="center" valign="top" width="33%">
      <img src=".docs/phone-qr-tool.jpeg" alt="QR generator on mobile" width="260" />
    </td>
    <td align="center" valign="top" width="67%">
      <img src=".docs/2026-engagement.gif" alt="Metrics viewer on desktop" width="520" />
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center"><em>QR generator site on mobile (left) and metrics-viewing site on desktop (right)</em></td>
  </tr>
</table>


### Hardware

<table>
  <tr>
    <td align="center" valign="top" width="33%">
      <img src=".docs/raspberry-pi-nes.JPG" alt="Raspberry Pi in NES-style housing" width="240" />
    </td>
    <td align="center" valign="top" width="34%">
      <img src=".docs/hardware-bundle-2026.jpg" alt="2026 portable hardware bundle" width="240" />
    </td>
    <td align="center" valign="top" width="33%">
      <img src=".docs/backpack.jpeg" alt="Gear packed in backpack" width="240" />
    </td>
  </tr>
  <tr>
    <td colspan="3" align="center"><em>All the components together. Using a portable power bank for Pi + printer. Everything in backpack is ~12lbs.</em></td>
  </tr>
</table>

### Deployment Notes

#### Process

##### Prepping Posters

<table>
  <tr>
    <td align="center" valign="top" width="33%">
      <img src=".docs/slow-lamination.gif" alt="Laminating posters" width="240" />
    </td>
    <td align="center" valign="top" width="34%">
      <img src=".docs/tape-back-posters.JPG" alt="Double-sided adhesive on back of posters" width="240" />
    </td>
    <td align="center" valign="top" width="33%">
      <img src=".docs/finished-laminating.jpg" alt="Finished laminated poster stacks" width="240" />
    </td>
  </tr>
  <tr>
    <td colspan="3" align="center"><em>Preparing the posters. The adhesive strips are supposedly reusable.</em></td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <img src=".docs/2026-poster-install-dead-tree.JPG" alt="Poster install on a dead tree" width="390" />
    </td>
    <td align="center" valign="top" width="50%">
      <img src=".docs/berwyn-stamp.jpg" alt="Custom city stamp for posters" width="390" />
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center"><em>My favorite install on a dead tree (left) and a custom stamp I bought to increase the perception of my poster's legitimacy (right)</em></td>
  </tr>
</table>

<br>


##### Installing Posters

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <img src=".docs/hotspot-pi-connected.jpg" alt="Hotspot showing Pi connected" width="390" />
    </td>
    <td align="center" valign="top" width="50%">
      <img src=".docs/2026-poster-installed.jpeg" alt="Installed poster with QR sticker and city stamp" width="390" />
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center"><em>Before heading out, I turn Pi on/off and wait to see hotspot connected. Takes around 30 seconds.</em></td>
  </tr>
</table>

- grab poster
  - print QR label sticker 
    - put sticker on poster 
      - remove adhesive backing on poster
        - install poster via adhesive backing
          - stamp poster with city stamp
            - pack up to next location

#### QR Scanning Competitors?!

<div align="center" style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
  <img src=".docs/someone-else-advertising-with-qr.jpg" width="400" style="margin:0 8px;" />
</div>
<div align="center"><em>Back off bro, this is my turf!</em></div>
<br>

#### Poster Printing Service Comparison

| Provider | Year | Material | Cost (pre-tax, pre-shipping) | Quantity | Notes |
|----------|------|----------|------------------------------|----------|-------|
| UPrinting | 2026 | 14 pt. Cardstock Gloss | $56.52 | 100 | Included 20 extras |
| NextDayFlyers | 2025 | 100 lb. Paper w/ Gloss | $32.92 | 50 | |

> UPrinting definitely wins this one. The 14 pt. cardstock was thicker and higher-end feeling. It was their cheapest option. Also the 20 freebies was 👌

### Engagement Notes

- First scan came within an hour after first poster install! I was pleased. It made me want to install more posters.
- The average person is going to interact with a poster a max of 1 time. There is no need to complete the tree form more than once.
  - Therefore, I expect to see less traffic over time once every poster is in place (May/June having higher engagement than August/September).
- Posters should face sidewalks for pedestrians, not streets for cars.
- People autopilot around; thinking about ways to grab their attention with future designs.
- Older people probably don't know how to use QR codes.

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