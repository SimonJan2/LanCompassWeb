---
title: "קווים"
description: "קווי WAN המקושרים לאתרים — מזהי ספק, רוחב פס וסטטוס."
category: "inventory"
keywords: "קו, קווים, ספק, WAN, בזק, רוחב פס"
version: "0.7.0"
order: 22
stale: false
---

# קווים

רישום קווי ה־WAN — שורה אחת לכל קו ספק, מקושרת לאתר.

## שדות

| שדה | הערות |
|---|---|
| **Env** | תג סביבה (prod / backup / test…) |
| **Site** | קישור לאתר; `site_number`, `site_code`, `site_name` משוכפלים (denormalized) לרשימות מהירות |
| **Line type** | Fiber / ETH / DSL… |
| **Bezeq circuit ID** | מזהה הקו אצל הספק |
| **Node** | צומת אגרגציה / POP |
| **BW down / up** | רוחב הפס המוקצה |
| **WAN IP** | כתובת ה־WAN של הקו |
| **App client # / name** | הפניה ללקוח בפורטל האפליקציות |
| **App service type** | סיווג שירות של הספק |
| **Contact / Status / Notes** | טקסט חופשי |
| **Retired** | `is_retired` שומר על ההיסטוריה בלי למחוק |

## מקורות

רוב נתוני הקווים מגיעים דרך
[ייבוא ה־workbook](/he/docs/import/) — גיליון הקווים משמש גם כמדריך אתרים
(שם אתר → מספר אתר + מיפוי קידומת), אז הוא גיליון ראשון טוב לייבוא.
שורות שומרות את ה־`import_batch_id` שלהן כמקוריות.

## עבודה עם הרשימה

סידור, נעיצה, תיוג, צביעת שורות, עריכת תאים והיסטוריה לכל שורה — אותן
יכולות כמו בכל רשימה ב־⁦LanCompass⁩. תוצאות חיפוש מופיעות ב
[פלטת הפקודות](/he/docs/search-and-shortcuts/) תחת "Circuits".
