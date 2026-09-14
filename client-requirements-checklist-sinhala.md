# Client Requirements Checklist — BYOB POS Setup (සිංහලෙන්)

මේ list එක restaurant owner එක්ක meeting එකට ගෙනියන්න. හැම question එකකටම යටින්ම උත්තරේ ලියන්න — මේකෙන් තමයි Supabase setup එකට data එක ගන්නේ.

## 1. Business basics (ව්‍යාපාරයේ මූලික තොරතුරු)
- [ ] Restaurant නම (bill/receipt එකේ පේන්න ඕන විදිහටම):
- [ ] ලිපිනය / phone number (receipt header එකට):
- [ ] Staff කීදෙනෙක් system එක පාවිච්චි කරාවිද, roles මොනවද? (උදා: cashiers 2ක්, kitchen screen එකක්, admin/owner 1ක්)

## 2. Tables
- [ ] මුළු table ගාන කීයද?
- [ ] හැම table එකකටම: table number + seats ගාන
      (උදා: Table 1 – seats 4, Table 2 – seats 2, Table 3 – seats 6...)
- [ ] කලින්ම "reserved" හෝ unavailable විදිහට mark කරන්න ඕන tables තියෙනවද?

## 3. Pool table
- [ ] Restaurant එකේ pool table එකක් තියෙනවද? (ඔව්/නෑ)
- [ ] තියෙනවා නම් — පැයකට rate එක (Rs.) කීයද?
- [ ] "පැයකට, round up කරලා" කියන rule එකට වඩා වෙනත් minimum charge rule එකක් තියෙනවද?

## 4. Menu
- [ ] සම්පූර්ණ menu list එක + prices — පුළුවන් නම් spreadsheet එකක් හෝ photo එකක් විදිහට ගන්න, meeting එකේදී items 40ක් අතින් type කරන්න හදන්න එපා
- [ ] Categories මොනවද? (උදා: Starters, Mains, Rice & Noodles, Desserts, Soft Drinks)
- [ ] නිතර stock ඉවර වෙන items තියෙනවද, "unavailable" toggle එකක් ඕන වෙන?

## 5. BYOB / Corkage
- [ ] බෝතලයකට corkage fee එක (Rs.) කීයද?
- [ ] ගෙනාපු බෝතලය ගානටද charge කරන්නේ, නැත්නම් table එකකට flat fee එකක්ද? (දැනට system එකේ තියෙන්නේ: බෝතලයට)

## 6. බිල් ගෙවීමේ rules
- [ ] Service charge % එකක් තියෙනවද?
- [ ] Discounts දෙනවද? Fixed amount එකක්ද, percentage එකක්ද, දෙකම ද?
- [ ] Cash විතරද, නැත්නම් card/QR payments ත් ගන්නවද? (දැනට system එකේ cash + change calculation විතරයි වැඩ කරන්නේ — card/QR ඕන නම් extra work එකක් ඕන)

## 7. Kitchen Printing
- [ ] මොන printer එකද තියෙන්නේ (හෝ ගන්න හදන්නේ)? Brand/model එක වැදගත් — thermal receipt printers connect වෙන විදිහ වෙනස් (USB, Bluetooth, network/WiFi, LAN).
- [ ] Printer එක දැනටමත් POS run වෙන computer/tablet එකට install කරලා තියෙනවද? නැත්නම්, go-live කරන්න කලින් මේක කරන්න ඕන.
- [ ] Kitchen tickets සහ customer bills දෙකටම එකම printer එකක්ද, වෙනම ද?

## 8. Devices
- [ ] POS එක run කරන්නේ මොන device එකේද — desktop PC ද, tablet ද, laptop ද?
- [ ] Restaurant එකේ Wifi/internet එක reliable ද? (දැන් backend connect වෙලා තියෙන නිසා වැදගත්, කලින් වගේ fully offline නෑ)
- [ ] Kitchen එකට වෙනම screen එකක් ඕනද (fired orders බලන්න), නැත්නම් cashier printed tickets ගෙනිහින් දෙනවද?

## 9. Reports & Access
- [ ] Sales reports බලන්න පුළුවන් වෙන්න ඕන කවුද — owner විතරද, managers ලාටත් ද?
- [ ] Remote log in කරන්න ඕනද (ගෙදර ඉඳලා sales බලන්න), නැත්නම් restaurant එකේදී විතරද?

## 10. Go-live
- [ ] Real customers ලාට use කරන්න පටන් ගන්න ඕන දිනය මොකක්ද?
- [ ] Trial/parallel-run period එකක් ඕනද (දවස් කිහිපයක් පරණ + අලුත් system දෙකම එකට run කරන එක), නැත්නම් හදිසි cutover එකක්ද?
- [ ] Handover එකෙන් පස්සේ මොකක් හරි problem එකක් ආවොත් contact කරන්නේ කාටද, response time එක මොකක්ද / support arrangement එක මොකක්ද?

---
### මේ meeting එක ඉවර වුනාට පස්සේ, ඔයාට මේවා කරන්න ඕන ඔක්කොම data එක තියෙයි:
1. Real tables/menu/pricing එක්ක Supabase project එක setup කරන්න (schema.sql)
2. Printer connection එක configure කරන්න
3. ඔවුන්ගේ real data එක්ක full flow එක test කරන්න
4. Deploy කරලා handover කරන්න
