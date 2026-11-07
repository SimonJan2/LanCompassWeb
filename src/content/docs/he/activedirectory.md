---
title: "Active Directory"
description: "סנכרון לקריאה בלבד מבקר תחום ב־LDAP — אובייקטי מחשב, האתרים ורשתות המשנה של AD, והשלמת שמות מארחים ב־PTR דרך בקר התחום."
category: "integrations"
keywords: "Active Directory, AD, LDAP, בקר תחום, דומיין, ספרייה"
version: "0.7.0"
order: 52
stale: false
---

# Active Directory

חיבור אחד לדירקטורי מזין שלושה ערוצי העשרה:

1. **אובייקטי מחשב → מכשירים** — `dNSHostName`, `operatingSystem`,
   `operatingSystemVersion`, `whenCreated`/`whenChanged`, `description`.
   שדות ה־UAC וה־OS מסווגים כל שורה כ־domain controller, שרת,
   תחנת עבודה או מחשב גנרי.
2. **AD Sites & Services → אתרים/רשתות** — AD עצמו שומר את מיפוי
   אתר↔רשת תחת `CN=Subnets,CN=Sites,CN=Configuration,…`, כך שהטופולוגיה
   האמיתית מסתנכרנת בלי שמישהו מקליד אותה ידנית.
3. **העשרת PTR דרך ה־DC כרזולבר** — ה־DC הוא כמעט תמיד גם שרת ה־DNS.
   כתובות שהסורק מצא ללא שם מחשב נשאלות ב־PTR מול ה־DC, והשמות
   שנמצאו נוחתים על הכתובת עם provenance של `Active Directory`.

הקונקטור בנוי קודם־ל־AD אבל מדבר LDAP סטנדרטי — FreeIPA, OpenLDAP
ו־Samba-AD לא מוחרגים מעיצובו (לא נבדקו בהשקה).

## תפקיד לקריאה בלבד

*נבדק מול ⁦Active Directory⁩ ברמת פונקציונליות 2016 ומעלה (במעבדה: ⁦Samba 4.22⁩ כבקר תחום תואם ⁦Windows⁩).*

1. צרו את `svc-lancompass` ב־⁦OU⁩ של חשבונות שירות, חבר ב־*⁦Domain Users⁩* בלבד — לא ב־*⁦Account Operators⁩* ולא ב־*⁦Domain Admins⁩*: כל משתמש מאומת יכול לקרוא מחשבים, אתרים ורשתות משנה, משתמשים וקבוצות, וזה כל מה ש־⁦LanCompass⁩ קוראת.
2. תנו לו סיסמה של 25 תווים לפחות ורשמו מתי צריך להחליף אותה — ⁦LanCompass⁩ מזהירה 14 ימים לפני שהיא פגה.
3. חסמו לחשבון כניסה מקומית וכניסה ב־⁦Remote Desktop⁩ במדיניות קבוצתית (*⁦Deny log on locally⁩*, *⁦Deny log on through Remote Desktop Services⁩*).
4. ייצאו את תעודת השורש של ה־⁦CA⁩ (`certutil -ca.cert root.cer`, ואז ⁦Base-64⁩) והדביקו אותה בשדה ה־⁦CA⁩ של המקור; השתמשו ב־`ldaps://` (פורט 636) או ב־⁦StartTLS⁩. בקר תחום שדורש חתימת ⁦LDAP⁩ דוחה כניסה פשוטה לא חתומה; כניסה פשוטה מעל ⁦TLS⁩ מתקבלת.
5. אל תתנו הרשאת קריאה לתכונות ⁦LAPS⁩ (`ms-Mcs-AdmPwd`, `msLAPS-Password`, `msLAPS-EncryptedPassword`) — ⁦LanCompass⁩ לעולם לא קוראת אותן.
6. כתבו בכתובת את שם התחום (`ldaps://corp.example.com`) כדי למצוא את כל בקרי התחום דרך ⁦DNS⁩, או רשמו אותם ב־*⁦Servers⁩*.

**מה ⁦LanCompass⁩ קוראת:** את ה־⁦RootDSE⁩, אובייקטי מחשב, ⁦Sites and Services⁩ (אתרים, רשתות משנה), תורי ההדפסה של המדפסות, הרשומות של אזורי ה־⁦DNS⁩ המשולבים ב־⁦AD⁩ ותשובות ⁦PTR⁩ לחלק מהכתובות — חיפושים וקריאות בלבד, לעולם לא כתיבה.

## לפני שמתחילים

- **חשבון שירות עם הרשאת קריאה.** הקונקטור הוא קריאה־בלבד מול
  הדירקטורי — הוא לעולם לא מבצע LDAP modify/add/delete — אבל עקרון
  המינימום הדרוש תקף גם בצד ה־AD. חבר פשוט ב־*Domain Users* מספיק
  לקריאת מחשבים/אתרים/רשתות.
- **הגעה ב־LDAPS או StartTLS** — TCP/636 או TCP/389 מ־⁦LanCompass⁩.
- **אישור ה־CA הפנימי** שלכם אם אישור ה־DC נגזר מ־AD CS (כמעט תמיד
  כך). הדבקת PEM, בלי צורך בהעלאת קובץ.

אף פעם לא עשיתם את זה? הסעיף הבא מלווה כל ערך מההתחלה עד הסוף — כל
הפקודות רצות על עמדת Windows מחוברת־דומיין או על ה־DC עצמו.

## איסוף הערכים מ־Active Directory

> [!details] סקריפט אוסף אחד — להרצה ב־PowerShell מוגבה על ה־DC (אופציונלי)
>
> הדביקו בחלון PowerShell מוגבה על ה־DC (שמרו כ־`Collect-⁦LanCompassAD⁩.ps1` והריצו
> `.\Collect-⁦LanCompassAD⁩.ps1`). הסקריפט מדפיס כרטיס מילוי לכל שדות ⁦LanCompass⁩, מבצע
> בדיקת TLS חיה על פורט 636, מייצא את שרשרת ה־CA אל `⁦LanCompass-CA⁩.pem` בשולחן
> העבודה ומפרט אתרים, סאבנטים ואזורי reverse. קריאה בלבד — הוסיפו
> `-CreateServiceAccount` רק אם רוצים שיצור גם את חשבון `svc-ipam`.
>
> אם לא נמצא אישור TLS, הוא מציע תיקון אינטראקטיבי — אישור
> self-signed (מומלץ) או הרפיית חתימת LDAP (מעבדה); `-NonInteractive`
> משאיר אותו read-only לאוטומציה.
>
> ```powershell
> <#
> .SYNOPSIS
>     Collects everything ⁦LanCompass needs for an Active Directory source.⁩
>     Run on a Domain Controller in an elevated PowerShell session.
> .PARAMETER CreateServiceAccount
>     Optional: also creates the read-only bind account and asks for
>     its password interactively.
> .PARAMETER NonInteractive
>     Skip the TLS-fix menu — the script only reports, never changes the DC.
> .PARAMETER OutDir
>     Where to write ⁦LanCompass-AD-Report⁩.txt and ⁦LanCompass-CA⁩.pem.
> #>
> [CmdletBinding()]
> param(
>     [switch]$CreateServiceAccount,
>     [switch]$NonInteractive,
>     [string]$ServiceAccountName = "svc-ipam",
>     [string]$OutDir = [Environment]::GetFolderPath("Desktop")
> )
>
> #Requires -RunAsAdministrator
> $ErrorActionPreference = "Continue"
> $report = New-Object System.Collections.Generic.List[string]
>
> function Section([string]$t) {
>     Write-Host "`n════ $t ════" -ForegroundColor Cyan
>     $report.Add("`n## $t")
> }
> function Row([string]$k, [string]$v) {
>     Write-Host ("  {0,-28} {1}" -f $k, $v) -ForegroundColor White
>     $report.Add("  ${k}: $v")
> }
> function Warn([string]$m) {
>     Write-Host "  ! $m" -ForegroundColor Yellow
>     $report.Add("  ! $m")
> }
> function Add-ToRootStore($cert) {
>     # Copy-Item doesn't work across cert stores — use the X509Store API.
>     $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root","LocalMachine")
>     $store.Open("ReadWrite"); $store.Add($cert); $store.Close()
> }
> function To-PEM([System.Security.Cryptography.X509Certificates.X509Certificate2]$c) {
>     $b64 = [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks')
>     "-----BEGIN CERTIFICATE-----`n$b64`n-----END CERTIFICATE-----"
> }
> function Probe-Ldaps([string]$targetFqdn) {
>     # Real test of LDAPS: Schannel must offer a cert. Port 636 LISTENING
>     # alone proves nothing — Server 2016+ opens it by default.
>     try {
>         $tcp = [Net.Sockets.TcpClient]::new("127.0.0.1", 636)
>         $ssl = [Net.Security.SslStream]::new($tcp.GetStream(), $false, { param($s,$c,$ch,$e) $true })
>         $ssl.AuthenticateAsClient($targetFqdn)   # SNI = our FQDN, like ⁦LanCompass does⁩
>         $cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($ssl.RemoteCertificate)
>         Row "Handshake"    "SUCCESS — LDAPS is live"
>         Row "Protocol"     $ssl.SslProtocol
>         $ssl.Dispose(); $tcp.Dispose()
>         return $cert
>     } catch {
>         Warn "Handshake FAILED: $($_.Exception.InnerException.Message)"
>         return $null
>     }
> }
>
> Section "0/7  Modules"
> try { Import-Module ActiveDirectory -ErrorAction Stop }
> catch { throw "ActiveDirectory module missing — run on a DC or install RSAT-AD-PowerShell." }
> Row "ActiveDirectory" "loaded"
> $dnsOk = $false
> try { Import-Module DnsServer -ErrorAction Stop; $dnsOk = $true; Row "DnsServer" "loaded" }
> catch { Warn "DnsServer module unavailable — reverse-zone discovery skipped." }
>
> Section "1/7  Domain & this DC"
> $dom  = Get-ADDomain
> $me   = $env:COMPUTERNAME
> $fqdn = "$me.$($dom.DNSRoot)".ToLower()
> $ips  = @((Get-NetIPAddress -AddressFamily IPv4 |
>          Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' }).IPAddress)
> Row "Domain DNS name" $dom.DNSRoot
> Row "NetBIOS name"    $dom.NetBIOSName
> Row "Domain mode"     $dom.DomainMode
> Row "Forest"          $dom.Forest
> Row "This DC"         $fqdn
> Row "IPv4 addresses"  ($ips -join ", ")
>
> Section "2/7  Naming contexts (Base DN)"
> $rootDSE = Get-ADRootDSE
> Row "defaultNamingContext" $rootDSE.defaultNamingContext   # <-- ⁦LanCompass⁩ 'Base DN' field
> Row "configurationNaming"  $rootDSE.configurationNamingContext
> Row "schemaNaming"         $rootDSE.schemaNamingContext
> # Sign-in readiness (V28): ⁦LanCompass uses simple binds over TLS⁩ — a DC
> # that only answers SASL/GSSAPI can't carry the sign-in lane.
> Row "supportedSASL"        (@($rootDSE.supportedSASLMechanisms) -join ", ")
>
> Section "3/7  All DCs in the domain (failover servers)"
> $dcs = Get-ADDomainController -Filter * | Sort-Object HostName
> foreach ($dc in $dcs) {
>     $ips2 = @()
>     try { $ips2 = (Resolve-DnsName $dc.HostName -Type A -ErrorAction Stop |
>                    Where-Object { $_.IPAddress }).IPAddress } catch {}
>     $tag = if ($dc.HostName -ieq $fqdn) { "   <-- this DC (primary)" } else { "" }
>     Row "DC" ("{0}  [{1}]  site={2}{3}" -f $dc.HostName, ($ips2 -join ","), $dc.Site, $tag)
> }
>
> Section "4/7  LDAP listeners on this DC"
> $l389 = [bool](Get-NetTCPConnection -State Listen -LocalPort 389 -ErrorAction SilentlyContinue)
> $l636 = [bool](Get-NetTCPConnection -State Listen -LocalPort 636 -ErrorAction SilentlyContinue)
> Row "TCP 389 (LDAP / StartTLS)" $(if ($l389) { "LISTENING" } else { "not listening" })
> Row "TCP 636 (LDAPS)"           $(if ($l636) { "LISTENING" } else { "not listening" })
> if ($l636) { Warn "636 listening alone does NOT prove LDAPS works — Server 2016+ opens it by default. The handshake probe below is the real test." }
>
> # Sign-in posture: signing-required DCs refuse unsigned simple binds
> # BEFORE the password is checked (strongerAuthRequired) — on 389 the
> # only fix that isn't "weaken the DC" is StartTLS or LDAPS.
> $signing = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters" -Name LDAPServerIntegrity -ErrorAction SilentlyContinue).LDAPServerIntegrity
> $signingText = switch ($signing) {
>     1       { "1 — unsigned binds allowed (lab posture)" }
>     2       { "2 — signing required (Server 2025 default)" }
>     default { "not set — treated as required on Server 2025" }
> }
> Row "LDAPServerIntegrity" $signingText
>
> Section "5/7  Live TLS handshake probe (port 636)"
> $tlsCert = $null
> if ($l636) {
>     $tlsCert = Probe-Ldaps $fqdn
>     if (-not $tlsCert) { Warn "636 is listening but has no usable cert — LDAPS is dead until you enroll one." }
> } else { Warn "636 not listening — no LDAPS." }
>
> # Server 2016+ DCs may keep the cert in the NTDS store — scan both.
> $storePaths = @("Cert:\LocalMachine\My")
> if (Test-Path "Cert:\LocalMachine\NTDS") { $storePaths += "Cert:\LocalMachine\NTDS" }
> $serverAuthOid = "1.3.6.1.5.5.7.3.1"
> $now = Get-Date
> $storeCerts = foreach ($sp in $storePaths) {
>     Get-ChildItem $sp | Where-Object {
>         $_.NotAfter -gt $now -and
>         ($_.EnhancedKeyUsageList | Where-Object ObjectId -eq $serverAuthOid)
>     }
> }
> Row "Server-auth certs"  ("{0} found in {1}" -f @($storeCerts).Count, ($storePaths -join " + "))
>
> $ldapCert = if ($tlsCert) { $tlsCert } else { $storeCerts | Sort-Object NotBefore -Descending | Select-Object -First 1 }
>
> if (-not $ldapCert) {
>     Warn "No usable server-auth certificate anywhere. Only plain LDAP (389, insecure) is possible as-is."
>     if ($NonInteractive) {
>         Warn "Re-run without -NonInteractive to fix it here, or enroll a 'Domain Controller Authentication' cert (AD CS)."
>     } else {
>         Write-Host ""
>         Write-Host "  Fix it on THIS DC now?" -ForegroundColor Cyan
>         Write-Host "   [1] Recommended — create a self-signed server-auth cert (enables LDAPS)"
>         Write-Host "   [2] Lab only    — relax LDAP signing (LDAPServerIntegrity=1, unsigned binds OK)"
>         Write-Host "   [3] Skip        — leave as-is (plain LDAP only)"
>         $fix = Read-Host "Choose 1, 2 or 3"
>         if ($fix -eq "1") {
>             try {
>                 $newCert = New-SelfSignedCertificate -DnsName $fqdn,$me `
>                     -CertStoreLocation "Cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(3) `
>                     -KeyUsage DigitalSignature,KeyEncipherment `
>                     -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")
>                 Row "Created cert" "$($newCert.Subject)  ($($newCert.Thumbprint))"
>                 # Self-signed must anchor itself: without it in Trusted Root,
>                 # Schannel skips the cert (chain won't validate) and the
>                 # handshake dies with "connection reset" even after reboots.
>                 $rootPath = "Cert:\LocalMachine\Root\$($newCert.Thumbprint)"
>                 if (-not (Test-Path $rootPath)) {
>                     Add-ToRootStore $newCert
>                     Row "Trusted Root" "added to Cert:\LocalMachine\Root (self-signed anchor)"
>                 }
>                 Warn "Restarting NTDS so Schannel loads the cert — interrupts DC logons briefly."
>                 Restart-Service NTDS -Force
>                 $tlsCert = $null
>                 foreach ($try in 1..6) {            # Schannel lags behind NTDS start
>                     Start-Sleep -Seconds 5
>                     $tlsCert = Probe-Ldaps $fqdn
>                     if ($tlsCert) { break }
>                 }
>                 $ldapCert = if ($tlsCert) { $tlsCert } else { $newCert }
>                 if (-not $tlsCert) { Warn "Still failing — Schannel sometimes needs a full DC reboot to load a new cert." }
>                 Warn "Certs do NOT replicate — repeat on every other DC, or use AD CS auto-enrollment."
>             } catch { Warn "Cert creation failed: $($_.Exception.Message)" }
>         } elseif ($fix -eq "2") {
>             try {
>                 Set-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters" -Name LDAPServerIntegrity -Value 1
>                 Warn "Restarting NTDS — interrupts DC logons briefly."
>                 Restart-Service NTDS -Force
>                 Warn "LDAP signing relaxed — unsigned simple binds now accepted. LAB ONLY. Revert: -Value 2 + restart."
>             } catch { Warn "Could not set LDAPServerIntegrity: $($_.Exception.Message)" }
>         } else {
>             Row "TLS fix" "skipped — plain LDAP only"
>         }
>     }
> }
>
> if ($ldapCert) {
>     Row "Cert subject"   $ldapCert.Subject
>     Row "Thumbprint"     $ldapCert.Thumbprint
>     Row "Issuer"         $ldapCert.Issuer
>     Row "Valid"          ("{0:d}  →  {1:d}" -f $ldapCert.NotBefore, $ldapCert.NotAfter)
>     $sanExt = $ldapCert.Extensions | Where-Object { $_.Oid.Value -eq "2.5.29.17" }
>     $sans = if ($sanExt) {
>         @([regex]::Matches($sanExt.Format($false), 'DNS Name=([^,]+)') |
>           ForEach-Object { $_.Groups[1].Value.Trim() })
>     } else { @() }
>     Row "SANs"           $(if ($sans) { $sans -join ", " } else { "(none)" })
>     if (-not ($sans -contains $fqdn) -and $ldapCert.Subject -notlike "*$fqdn*") {
>         Warn "Cert doesn't name $fqdn — hostname verification will fail. Use one of the SANs above in the URI instead, or re-issue."
>     }
>     if (-not $tlsCert) {
>         # Self-signed cert that isn't in Trusted Root: Schannel refuses to
>         # bind a cert whose chain won't validate — handshake = reset-by-peer.
>         $rootPath = "Cert:\LocalMachine\Root\$($ldapCert.Thumbprint)"
>         if ($ldapCert.Issuer -eq $ldapCert.Subject -and -not (Test-Path $rootPath)) {
>             Warn "Self-signed cert is missing from Cert:\LocalMachine\Root — Schannel skips certs whose chain won't build."
>             if ($NonInteractive) {
>                 Warn "Fix: add the cert to Trusted Root, then Restart-Service NTDS -Force"
>             } elseif ((Read-Host "Add it to Trusted Root + restart NTDS now? [Y/n]") -notmatch '^[nN]') {
>                 Add-ToRootStore $ldapCert
>                 Warn "Restarting NTDS — interrupts DC logons briefly."
>                 Restart-Service NTDS -Force
>                 Start-Sleep -Seconds 3
>                 $tlsCert = Probe-Ldaps $fqdn
>                 if (-not $tlsCert) { Warn "Still failing — reboot the DC." }
>             }
>         } else {
>             Warn "Cert exists in the store but the handshake still fails — Schannel hasn't bound it yet."
>             Warn "Restart-Service NTDS -Force again, or reboot the DC — Schannel loads certs reliably at boot."
>         }
>     }
> }
>
> $pemPath = $null
> if ($ldapCert) {
>     $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
>     $null = $chain.Build($ldapCert)
>     $caCerts = @($chain.ChainElements | Select-Object -Skip 1)
>     if (-not $caCerts) {
>         Warn "Self-signed cert — exporting the leaf itself as the trust anchor."
>         $caCerts = @([pscustomobject]@{ Certificate = $ldapCert })
>     }
>     $pemPath = Join-Path $OutDir "⁦LanCompass-CA⁩.pem"
>     $pemText = ($caCerts | ForEach-Object { To-PEM $_.Certificate }) -join "`n"
>     Set-Content -Path $pemPath -Value $pemText -Encoding ascii
>     Write-Host "`n── CA chain PEM (paste into 'Internal CA certificate') ──" -ForegroundColor Cyan
>     foreach ($el in $caCerts) {
>         Row "CA cert" ("{0}   ({1})" -f $el.Certificate.Subject, $el.Certificate.Thumbprint)
>     }
>     Write-Host "`n$pemText" -ForegroundColor DarkGray
>     Row "Saved PEM to" $pemPath
> }
>
> Section "6/7  Sites, subnets & reverse-DNS zones"
> $sites = $null
> try {
>     $sites = Get-ADReplicationSite -Filter *
>     foreach ($s in $sites | Sort-Object Name) { Row "Site" $s.Name }
> } catch { Warn "Could not read sites: $($_.Exception.Message)" }
>
> $subs = $null
> try {
>     $subs = Get-ADReplicationSubnet -Filter * -Properties Site
>     foreach ($sn in $subs | Sort-Object Name) {
>         $siteName = "(unassigned)"
>         if ($sn.Site) { $siteName = ($sn.Site -split ',')[0] -replace '^CN=','' }
>         Row "Subnet" ("{0,-20} → site {1}" -f $sn.Name, $siteName)
>     }
>     if (-not $subs) { Warn "No AD subnets defined — Sites channel syncs nothing until you add them in dssite.msc." }
> } catch { Warn "Could not read subnets: $($_.Exception.Message)" }
>
> # Skip Windows's built-in blackhole zones (0/127/255) — never PTR scopes.
> $blackhole = @('0.in-addr.arpa','127.in-addr.arpa','255.in-addr.arpa')
> $ptrCidrs = New-Object System.Collections.Generic.List[string]
> if ($dnsOk) {
>     try {
>         $zones = Get-DnsServerZone | Where-Object IsReverseLookupZone |
>                  Where-Object { $blackhole -notcontains $_.ZoneName }
>         foreach ($z in $zones) {
>             if ($z.ZoneName -match '^([0-9.]+)\.in-addr\.arpa$') {
>                 $oct = $Matches[1].Split('.'); [array]::Reverse($oct)
>                 $cidr = "$(($oct + @('0','0','0','0'))[0..3] -join '.')/$(8 * $oct.Count)"
>                 $ptrCidrs.Add($cidr)
>                 Row "Reverse zone" ("{0,-40} ≈ {1}" -f $z.ZoneName, $cidr)
>             } else {
>                 Row "Reverse zone" "$($z.ZoneName)  (classless/IPv6 — translate manually)"
>             }
>         }
>         if (-not $zones) { Warn "No real reverse zones hosted — PTR lookups return nothing until you create one." }
>     } catch { Warn "DNS zone query failed: $($_.Exception.Message)" }
> }
> $ptrSuggestion =
>     if     ($ptrCidrs) { $ptrCidrs -join ", " }
>     elseif ($subs)     { ($subs.Name) -join ", " }
>     elseif ($ips)      { (($ips[0] -split '\.')[0..2] -join '.') + ".0/24  (your LAN — no reverse zone yet)" }
>     else               { "10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16" }
>
> Section "7/7  Preview counts & bind account"
> try { Row "Computer objects" ((Get-ADComputer -Filter *).Count) } catch { Warn "Get-ADComputer failed: $($_.Exception.Message)" }
>
> $bindUpn = "(create a service account, e.g. $ServiceAccountName@$($dom.DNSRoot))"
> if ($CreateServiceAccount) {
>     $existing = Get-ADUser -Filter "SamAccountName -eq '$ServiceAccountName'" -ErrorAction SilentlyContinue
>     if ($existing) {
>         $bindUpn = "$ServiceAccountName@$($dom.DNSRoot)"
>         Warn "Account $ServiceAccountName already exists — reusing it."
>     } else {
>         $pw = Read-Host "Password for $ServiceAccountName" -AsSecureString
>         $u = New-ADUser -Name $ServiceAccountName -SamAccountName $ServiceAccountName `
>              -UserPrincipalName "$ServiceAccountName@$($dom.DNSRoot)" `
>              -Path "CN=Users,$($rootDSE.defaultNamingContext)" `
>              -AccountPassword $pw -Enabled $true -PasswordNeverExpires $true `
>              -CannotChangePassword $true -Description "Read-only ⁦LanCompass LDAP bind account⁩" -PassThru
>         $bindUpn = "$ServiceAccountName@$($dom.DNSRoot)"
>         Row "Created account" $u.DistinguishedName
>         Warn "Plain 'Domain Users' membership is enough — do NOT add it to admin groups."
>     }
> } else {
>     Row "Bind account" "$bindUpn  (rerun with -CreateServiceAccount)"
> }
>
> if ($tlsCert)        { $scheme="ldaps"; $enc="LDAPS"; $uri="ldaps://$fqdn" }
> elseif ($ldapCert)   { $scheme="ldap";  $enc="StartTLS"; $uri="ldap://$fqdn" }
> else                 { $scheme="ldap";  $enc="Plain (insecure — tick the acknowledgement)"; $uri="ldap://$fqdn" }
>
> Section "★ ⁦LanCompass fill-in card⁩ ★"
> Row "Primary URI"        $uri
> Row "Encryption"         $enc
> $fail = @($dcs | Where-Object { $_.HostName -ine $fqdn } | ForEach-Object { "$scheme`://$($_.HostName)" })
> Row "Failover servers"   $(if ($fail) { $fail -join ", " } else { "(only one DC found)" })
> Row "Base DN"            $rootDSE.defaultNamingContext
> Row "Bind identity"      $bindUpn
> Row "Bind password"      "(the svc account's password — not shown here)"
> Row "Internal CA PEM"    $(if ($pemPath) { "file: $pemPath (also printed above)" } else { "not needed — plain LDAP" })
> Row "PTR CIDRs"          $ptrSuggestion
> Row "Resolve all (PTR)"  "On (default)"
> Row "Sections"           "computers$(if ($sites){', sites'}), clients(PTR)"
> # Directory sign-in (Settings → Security → Directory authentication)
> Row "Sign-in user base"  $rootDSE.defaultNamingContext
> Row "Sign-in filter"     "(|(sAMAccountName={u})(userPrincipalName={u}))"
> Row "LDAPS cert"         $(if ($tlsCert) { "valid until $($tlsCert.NotAfter.ToString('yyyy-MM-dd'))" } elseif ($ldapCert) { "in store until $($ldapCert.NotAfter.ToString('yyyy-MM-dd')) — handshake probe failed" } else { "none — LDAPS unavailable" })
>
> $rpt = Join-Path $OutDir "⁦LanCompass-AD-Report⁩.txt"
> $report | Set-Content $rpt -Encoding utf8
> Write-Host "`nReport saved to $rpt" -ForegroundColor Green
> Write-Host "Copy the card values into Settings → Integrations → New source → Active Directory." -ForegroundColor Green
> ```

### למצוא את כתובת ה־domain controller

הקיצור הכי קל: ה־DC הוא כמעט תמיד שרת ה־DNS שלכם.

- **מכל תחנת עבודה בדומיין** — `ipconfig /all`: שורת *DNS Servers*
  היא בדרך כלל כתובת של DC.
- **שאלו את הדומיין איזה DC ענה לכם** —
  `nltest /dsgetdc:%USERDNSDOMAIN%` (CMD · PowerShell: `$env:USERDNSDOMAIN`) מדפיס `\\DC01.corp.local`
  והכתובת שלו.
- **שאלו את ה־DNS על כל ה־DCs** —
  `nslookup -type=SRV _ldap._tcp.dc._msdcs.corp.local` (PowerShell: `Resolve-DnsName _ldap._tcp.dc._msdcs.corp.local -Type SRV`) מציג את כל
  ה־DCs; הנותרים הופכים לשרתי ה־failover שלכם.
- **או הביטו במפה** — `dssite.msc` (Active Directory Sites and
  Services) → הרחיבו אתר ← *Servers* מציג את ה־DCs שלו.

ערך לטופס: `ldaps://dc01.corp.local`. כתובת IP גם עובדת
(`ldaps://10.0.0.10`), אבל אישור ה־TLS חייב לציין מה שכתבתם —
אישורים מונפקים לשמות, אז עדיף את ה־FQDN.

### למצוא את ה־Base DN

ה־Base DN הוא שם הדומיין משוכתב בסימון LDAP — מפצלים על הנקודות
ומוסיפים `DC=` לכל חלק:

`corp.local` → `DC=corp,DC=local` · `hq.example.com` →
`DC=hq,DC=example,DC=com`

לבדוק במקום לגזור:

- `echo %USERDNSDOMAIN%` (CMD · PowerShell: `$env:USERDNSDOMAIN`) על עמדה בדומיין מציג את ה־FQDN להמרה.
- PowerShell: `(Get-ADDomain).DistinguishedName` מדפיס את ה־DN
  במדויק.
- או לשאול את הדירקטורי עצמו: `ldp.exe` → *Connection → Connect* →
  *Connection → Bind*, ואז *View → Tree* — ה־dropdown מציג את
  ה־naming contexts.

אפשר גם פשוט להשאיר את Base DN ריק — הקונקטור מגלה אוטומטית את
`defaultNamingContext` מ־RootDSE. השדה משנה רק כשרוצים לצמצם את
הסנכרון לתת־עץ.

### ליצור את חשבון השירות לקריאה־בלבד

כל חשבון דומיין רגיל יכול לקרוא אובייקטי מחשב ואת תצורת
Sites & Services — לא צריך הרשאות admin. חשבון ייעודי עדיין משתלם:
שלילתו מכבה את האינטגרציה בנקיות.

1. פתחו **Active Directory Users and Computers** (`dsa.msc`) →
   הדומיין שלכם → *Users* → קליק ימני ← *New → User*.
2. תנו שם שמסביר את עצמו — `svc-ipam` — הגדירו סיסמה חזקה, סמנו
   *Password never expires*, בטלו *User must change password at
   next logon*.
3. אין עוד מה להעניק — חברות ברירת־המחדל ב־*Domain Users* כבר
   מספיקה לקריאה.

זהות bind בטופס: `svc-ipam@corp.local` (UPN — הכי פשוט) או ה־DN
המלא `CN=svc-ipam,CN=Users,DC=corp,DC=local`.

שקול ב־PowerShell:

```powershell
New-ADUser svc-ipam -Enabled $true `
  -AccountPassword (Read-Host -AsSecureString "Password") `
  -PasswordNeverExpires $true -CannotChangePassword $true
```

### לבדוק את נתיב ההצפנה

- **LDAPS (636)** — `Test-NetConnection dc01.corp.local -Port 636`.
  `TcpTestSucceeded: True` אומר שה־DC כבר מגיש TLS (הוא עושה זאת
  ברגע שיש לו אישור server-auth — AD CS מנפיק כזה אוטומטית).
- **StartTLS (389)** — אותה בדיקה מול 389, שכמעט תמיד פתוח;
  החיבור מתחיל cleartext ומשתדרג לפני ה־bind.
- **Plain (389)** — אותה פורט, בלי TLS בכלל. למעבדה בלבד, והטופס
  דורש סימון הכרה מפורש.

### להשיג את אישור ה־CA הפנימי

אם TCP/636 עונה אבל שלב ה־TLS מדווח על שרשרת לא־אמינה, אישור ה־DC
הונפק על ידי ה־CA הפנימי שלכם (בדרך כלל AD CS) — ⁦LanCompass⁩ צריך את
האישור *הציבורי* של אותו CA ב־PEM. זה אובייקט ציבורי, לא סוד.

- **ממשק הרישום בווב (הכי קל)** — גלשו ל־`http://<ca-server>/certsrv`
  → *Download a CA certificate, certificate chain, or CRL* → בחרו
  את ה־CA → *Base 64* → הורידו. הקובץ כבר PEM — הדביקו אותו ישירות
  לטופס.
- **על ה־CA עצמו** — `certutil -ca.cert ca.cer` כותב את אישור ה־CA
  ב־DER; המירו ל־PEM עם `certutil -encode ca.cer ca.pem`.
- **מהקו עצמו** —
  `openssl s_client -connect dc01.corp.local:636 -showcerts` מדפיס
  את השרשרת המוצגת; בלוק ה־`-----BEGIN CERTIFICATE-----` האחרון הוא
  ה־CA המנפיק. העתיקו את הבלוק כמו שהוא.

### מאיפה האתרים והרשתות מגיעים

`dssite.msc` ← *Sites* הוא בדיוק מה שהקונקטור קורא: כל אובייקט אתר,
ותחת *Subnets* כל קשירת `subnet ↔ site`. מה שגלוי שם הוא מה שמופיע
בתצוגה המקדימה — שום דבר לא מומצא.

### תצוגה מקדימה של ערוץ המחשבים

`Get-ADComputer -Filter * -Properties DNSHostName,OperatingSystem`
קרוב מאוד למה שנוחת בתוכנית — `dNSHostName` מנצח; ה־`name` החשוף
הוא הגיבוי.

## שלב 1 — הוספת המקור

הגדרות ← אינטגרציות ← **הוסף מקור** ← סוג **Active Directory**.

- **LDAP URI** — `ldaps://dc1.corp.local` (או `ldap://` בצימוד עם
  StartTLS/plain). זה השרת הראשי. אפשר גם לתת את הדומיין עצמו
  (`ldaps://corp.local`): אז בקרי התחום מאותרים ב־⁦DNS⁩, קודם אלה של
  האתר של השרת הזה (ראו *איתור בקרי התחום*).
- **שרתי גיבוי** — URIs נוספים של DC, שנוסים לפי הסדר כשהראשי
  לא זמין (אחרי בקרי התחום ש־⁦DNS⁩ מונה, כשהוא מונה כאלה).
- **הצפנה**:
  - `LDAPS` — ברירת מחדל, TLS מהחיבור. מומלץ.
  - `StartTLS` — שדרוג על פורט 389 לפני ה־bind. אותו אימות.
  - `Plain LDAP` — opt-in בלבד. מציג אזהרת cleartext ודורש סימון
    ״אני מבין/ה״ לפני שכפתור הבדיקה נפתח; רשימת המקורות תסמן את
    המקור בתגית לא־מאובטח. ״דלג על אימות TLS״ בכוונה לא מוצע —
    plaintext הוא פתח המילוט, לא TLS עיוור.
- **CA פנימי (PEM)** — הדביקו את אישור ה־CA המנפיק כדי שאישור ה־DC
  מ־AD CS יאומת.
- **זהות bind** — חשבון שירות כ־DN
  (`CN=svc-ipam,OU=Service,DC=corp,DC=local`) או UPN
  (`svc-ipam@corp.local`) + סיסמה. נשמר מוצפן, לעולם לא מוחזר
  מה־API.
- **Base DN** — השאירו ריק לגילוי אוטומטי של `defaultNamingContext`
  מ־RootDSE; הגדירו אותו (למשל `OU=Sites,DC=corp,DC=local`) כדי
  לצמצם את הסנכרון לתת־עץ.

## שלב 2 — סקופ

- **ערוצים** — מחשבים, אתרים/רשתות, העשרת שמות מחשב (PTR).
- **סקופ אתרים** — סמנו אילו אתרי AD מסנכרנים את הרשתות שלהם.
  למחשבים אין מאפיין אתר ב־AD, אז ערוץ המכשירים לא מוגבל בסקופ.
- **CIDRs ל־PTR** — אילו כתובות זכאיות להעשרה. ברירת המחדל היא
  טווחי ה־RFC1918 שה־IPAM עוקב אחריהם
  (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) — אזורי reverse
  פרטיים שה־DC באמת מארח, לא הפצצת PTR על IPs ציבוריים.

כברירת מחדל ה־PTR פותר *כל* כתובת במתחם — מתג **פענוח כל
הכתובות** במקור — לא רק כתובות שהסורק מצא בלי שם מחשב; סטייה מול
שמות שמורים צפה כהתנגשויות, וכללי הבעלות עדיין מגנים על ערכי
ידני/ייבוא. כבה אותו לחזרה להתנהגות סורק-בלבד, או השתמש במתג
**העשרת PTR מ־AD** התלת־מצבי על רשת (עמוד הרשת או דיאלוג העריכה)
או אתר (דיאלוג האתר): דגל הרשת גובר על דגל האתר, ושניהם גוברים על
ברירת המקור.

## שלב 3 — בדיקה

סולם הבדיקה מציג חמש שורות מעוצבות (אחרי שורת **⁦DNS⁩** כשהכתובת מציינת
דומיין ש־⁦DNS⁩ מונה את בקרי התחום שלו — ראו *איתור בקרי התחום*):

1. **TCP** — זמינות socket לכל URI של שרת (הערת failover מציינת
   איזה host ענה כש־URI מאוחר יותר מנצח).
2. **TLS** — לחיצת יד ל־`ldaps`, או שדרוג StartTLS על 389.
3. **Bind** — אימות. כשל מציע לבדוק את פורמט ה־UPN `user@domain`
   מול DN מלא.
4. **Base DN** — ה־naming context שהוגדר או התגלה קריא.
5. **Sample** — כל ערוץ מופעל מריץ חיפוש probe חסום.

> [!tip] טיים־אאוט ב־TCP אבל `Test-NetConnection` עובד מהמחשב?
>
> Docker פותר שמות דרך ה־DNS של המארח — דומיין מעבדה שקיים גם כדומיין ציבורי
> חונה מקבל IP חולף. נעצו את ה־DC האמיתי ב־`docker-compose.override.yml`:
>
> ```yaml
> # docker-compose.override.yml — Compose merges this file automatically.
> # Copy the shipped docker-compose.override.example.yml and edit.
> services:
>   api:                                # runs the connection test
>     extra_hosts:
>       - "dc01.corp.local:10.1.0.10"   # DC FQDN -> its real IP
>       - "corp.local:10.1.0.10"        # apex domain (optional)
>   scanner:                            # runs scheduled syncs + PTR
>     extra_hosts:
>       - "dc01.corp.local:10.1.0.10"
>       - "corp.local:10.1.0.10"
> ```
> הריפו מספק את `docker-compose.override.example.yml` — העתיקו אותו
> וערכו את הערכים (הקובץ האמיתי לא נכנס ל־git). החילו עם
> `docker compose up -d`. או השתמשו ב־IP של ה־DC ב־URI עבור LDAP גלוי
> (TLS צריך FQDN שיתאים לתעודה).

> [!warning] `strongerAuthRequired` בשלב ה־Bind?
>
> בקרי Windows Server 2025 אוכפים חתימת LDAP כברירת מחדל — bind פשוט ללא
> חתימה נדחה עוד לפני בדיקת הסיסמה. מתקנים ב־DC ואז לוחצים **Retry**.

**מומלץ — אישור server-auth ב־DC ואז LDAPS.** הכי קל: הריצו שוב את
סקריפט האיסוף ובחרו אופציה 1. או ידנית — PowerShell מוגבה על ה־DC:

```powershell
$cert = New-SelfSignedCertificate -DnsName "dc01.corp.local","DC01" `
  -CertStoreLocation "Cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(3) `
  -KeyUsage DigitalSignature,KeyEncipherment `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")
# self-signed must anchor itself in Trusted Root, else Schannel skips it
$root = [System.Security.Cryptography.X509Certificates.X509Store]::new("Root","LocalMachine")
$root.Open("ReadWrite"); $root.Add($cert); $root.Close()
Restart-Service NTDS -Force
```

הריצו שוב את סקריפט האיסוף — בדיקת ה־TLS תיראה ירוקה והוא ייצא את האישור
כ־**Internal CA PEM**. אחר כך החליפו את המקור ל־`ldaps://dc01.corp.local`
/ הצפנה **LDAPS**.

אם הבדיקה עדיין נכשלת אחרי אתחול NTDS, אתחלו את ה־DC — Schannel
טוען את האישור החדש בצורה אמינה בזמן עלייה.

> [!details] מעבדה בלבד — הרפיית חתימת LDAP ב־DC
>
> הריצו שוב את הסקריפט ובחרו אופציה 2 — או הגדירו ידנית:
> ‏`LDAPServerIntegrity=1` מאפשר binds לא־חתומים, ואז מפעיל מחדש את
> AD DS. הסיסמה וכל תעבורת ה־LDAP נשארים גלויים ברשת — אל תעשו זאת מחוץ
> למעבדה.
>
> ```powershell
> Set-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters -Name LDAPServerIntegrity -Value 1
> Restart-Service NTDS -Force
> ```
>
> כדי להחזיר את האכיפה: `-Value 2` ועוד הפעלה מחדש.

## שלב 4 — תצוגה מקדימה והחלה

התצוגה המקדימה מראה את ה־diff הרגיל: שורות חדשות/מותאמות/בהתנגשות
לאתרים, רשתות, מכשירים ועדכוני שמות מחשב על כתובות קיימות. שורות
רשת מפנות את שם ה־`site` שלהן לשורת האתר — אתרים חדשים נוצרים קודם
כדי שהרשתות ינחתו מחוברות.

## שלב 5 — תזמון

קצב רגיל. טופולוגיית AD משתנה לאט — סנכרון יומי הוא ברירת מחדל
הגיונית.

## התחברות עם Active Directory

אותו מקור משמש גם כ־Directory להתחברות — אין צורך להגדיר חיבור שני ואין
PEM נוסף של CA שיסטה. ב־**הגדרות → חשבון ואבטחה → אימות מול Directory**:

- **הפעלת התחברות מול Active Directory** ובחירת המקור הזה כ־provider — השרתים,
  הגיבוי, ההצפנה וחשבון השירות כולם מגיעים ממנו.
- **בסיס/מסנן חיפוש משתמשים** — ברירות המחדל מכסות AD תקני. המסנן
  `(|(sAMAccountName={u})(userPrincipalName={u}))` מקבל גם `user`
  וגם `user@domain`; `{u}` הוא שם המשתמש שהוזן.
- **מיפוי קבוצה ← תפקיד** — JSON כמו `{"Domain Admins": "admin",
  "Help Desk": "operator"}`. שמות קבוצות ו־DN-ים מלאים שניהם תואמים,
  וקבוצות מקוננות נפתרות דרך כלל שרשרת החברות
  (`LDAP_MATCHING_RULE_IN_CHAIN`).
- **תפקיד ברירת מחדל** — התפקיד שמקבלים משתמשים מאומתים כשאף קבוצה לא
  תואמת; בחרו *דחייה* כדי לחייב מיפוי.

**בדיקת משתמש** עונה על שאלת האינטגרציה בלי להתחבר: מזינים שם משתמש
והסולם מדווח על ה־bind של השירות, ה־DN שזוהה, רשימת הקבוצות והתפקיד
המתקבל — פסק "אין מיפוי קבוצה" נבדל מ״משתמש לא נמצא״.

בדף ההתחברות המשתמשים בוחרים **חשבון מקומי** או **Active Directory**.
התחברות directory מוצלחת ראשונה מקצה את החשבון (שם משתמש מ־
`sAMAccountName`, שם תצוגה ודוא״ל מה־directory); הסיסמה שהוזנה משמשת
ל־bind ומושלכת — רק חשבון השירות נשמר. כניסות כושלות חולקות את מדיניות
הנעילה המקומית.

כללי התנגשות: מקור ההתחברות השמור מנצח. מנהל מקומי יכול להמיר משתמש
בין המקורות ב־**הגדרות → משתמשים ותפקידים** — המרה למקומי דורשת הגדרת
סיסמה באותה שמירה. ההמרה הזו היא גם נתיב הגיבוי כשה־DC מושבת: התחברות
ה־directory נכשלת סגורה ("ה־directory אינו זמין"), ההתחברות המקומית
לא נפגעת. שמרו חשבון admin מקומי אחד בדיוק למקרה הזה.

מי יכול להתחבר, תפקידים לפי SID ואיך עובד שעוזב מאבד גישה בתוך דקות:
[כניסה מאוחדת ← מי יכול להתחבר](/he/docs/sso/#מי-יכול-להתחבר),
[תפקידים לפי SID](/he/docs/sso/#תפקידים-לפי-sid) ו־
[השבתה אוטומטית](/he/docs/sso/#השבתה-אוטומטית).

## תוקף חשבון השירות

כל **בדיקה** וכל סנכרון קוראים את `pwdLastSet`, ‏`accountExpires`
ו־`msDS-UserPasswordExpiryTimeComputed` של חשבון ה־bind עצמו (התאריך ש־AD
מחשב לפי מדיניות הסיסמאות של הדומיין). המוקדם מבין שני התאריכים הוא הרגע
שבו החשבון מפסיק לעבוד:

- **שבועיים לפני**, המקור אומר זאת — בשורה שלו בהגדרות ← אינטגרציות,
  בפירוט הערוצים שלו, ובשורת *חשבון השירות* של הבדיקה: *„הסיסמה של חשבון
  השירות תפוג בעוד {days} ימים ({date})”*. החליפו את הסיסמה (או סמנו
  *Password never expires*, כפי ש[חשבון השירות](#ליצור-את-חשבון-השירות-לקריאה-בלבד)
  למעלה ממליץ) לפני כן.
- **אחרי שפג**, ה־bind נכשל ו־⁦LanCompass⁩ אומר זאת במקום
  *invalidCredentials*: בדיקה, תצוגה מקדימה וסנכרון עונים *„הסיסמה של חשבון
  השירות פגה — הסנכרונים וההתחברות דרך הספרייה מופסקים עד שתוחלף”*, ומי
  שמתחבר דרך הספרייה קורא *„ההתחברות דרך הספרייה אינה זמינה: החשבון של
  ⁦LanCompass⁩ בספרייה אינו מצליח להתחבר — פנו לצוות הניהול”* (ולא
  *ה־directory אינו זמין*). גם הסיבה של AD עצמו ל־bind שנדחה (סיסמה שפגה,
  חשבון שפג, חובה להחליף סיסמה) נקראת, כך שזה נכון גם כשהתאריך מעולם לא
  נקרא.

## מה הספרייה מביאה

כל סנכרון קורא **את כל אובייקטי המחשב** ב־Base DN — עד 50,000 (מעבר לזה
הסנכרון אומר שעצר וכמה קרא, ונשאר *חלקי*; הוא אף פעם לא חותך בשקט). לכל
מחשב ⁦LanCompass⁩ שומר את מה שהספרייה אומרת לצד המכשיר, בלי לשנות את מה
שאדם כתב:

| מאפיין בספרייה | לאן הוא הולך |
|---|---|
| `dNSHostName` (אחרת `name`) | שם המכשיר |
| `userAccountControl` | **המצב** שלו (פעיל, לא פעיל, מושבת) והסוג: בקר תחום, ו**בקר תחום לקריאה בלבד** (⁦RODC⁩ הוא בקר תחום, מסומן כקריאה בלבד) |
| `operatingSystem`, ‏`operatingSystemVersion` | **מערכת ההפעלה** ומצב **התמיכה** בה — לעולם לא שדה *הדגם* (דגם הוא חומרה). דגם שסנכרון ישן כתב כמחרוזת מערכת ההפעלה מנוקה רק במכשירים של המקור עצמו |
| `lastLogonTimestamp` | **ההתחברות האחרונה** |
| `managedBy` | **הבעלים**, בשם שהספרייה מציגה לחשבון |
| `location`, ה־DN | **המיקום** ו**היחידה הארגונית**, מלמעלה למטה (*LCIX / מחשבים / תל אביב*) |
| `description` | **ההערות** של המכשיר, כשהן ריקות והמכשיר שייך למקור (הערות של אדם לא משתנות); תמיד בכרטיס הספרייה |
| `whenCreated`, ‏`whenChanged` | **נוצר** ו**שונה** |
| `pwdLastSet`, ‏`servicePrincipalName` | נשמרים עם השאר (השירותים שה־SPN של המחשב מונה) |
| `objectGUID` | המזהה של האובייקט לכל חייו — מחשב ששמו שונה או שהועבר נשאר מכשיר אחד |

**מחשבים מושבתים** לא נוצרים. מחשב מושבת שכבר נמצא במלאי (נוצר בסנכרון
קודם או הותאם לפי שם) מופיע בסקירה הבאה של המקור תחת **לא נמצא עוד
ב־{source}** כ*מושבת ב־{source}*, עם **להוציא משימוש** או **להשאיר** —
סנכרון מתוזמן אף פעם לא מוציא אותו משימוש. כל סקירה מציינת כמה מחשבים
מושבתים לא נוצרו.

**חשבונות שירות מנוהלים** (מנוהלי־קבוצה ועצמאיים) הם אובייקטי מחשב ב־⁦AD⁩
אבל לא מחשבים: הם לעולם לא מכשירים, והסקירה מונה אותם — *„2 חשבונות שירות
דולגו (אינם מחשבים)”*.

**מדפסות.** תורי ההדפסה שהספרייה מפרסמת (`printQueue`) הופכים למכשירים
מסוג *מדפסת*, עם השרת, השיתוף, הדרייבר והמיקום. תור שהפורט שלו קרוי על שם
כתובת ⁦IPv4⁩ (`10.0.0.5` או `IP_10.0.0.5`) נושא את הכתובת: היא מקושרת
למדפסת כששתי השורות שייכות למקור, ומוצעת לאדם בכל מקרה אחר (כלל הקישור של
כל מקור).

כל קריאה היא קריאה בלבד: החיבור נפתח לקריאה בלבד, וסנכרון מלא משאיר את
`highestCommittedUSN` של כל בקר תחום כפי שהיה.

## לא פעילים ותמיכה

מחשב הוא **לא פעיל** כשהוא פעיל בספרייה וההתחברות האחרונה שלו ישנה מהקו של
המקור — **90 ימים**, אלא אם המקור קובע אחרת (*לא פעיל אחרי (ימים בלי
התחברות)*, בין 30 ל־3,650, בשלב **חיבור** של המקור). מחשב שמעולם לא התחבר הוא
לא פעיל כשהוא נוצר לפני הקו. ⁦AD⁩ מעביר את `lastLogonTimestamp` לכל בקרי
התחום רק כל 9 עד 14 ימים, כך שקו קצר מ־30 ימים היה מסמן מכונות חיות.
מחשב לא פעיל נוצר ונשמר כמו כל מחשב אחר; הוא מסומן, אף פעם לא מוסתר ואף
פעם לא מוצא משימוש על ידי ⁦LanCompass⁩.

מצב **התמיכה** נלקח מטבלה של גרסאות ⁦Windows⁩ ללקוח ולשרת שנשמרת
ב־⁦LanCompass⁩; כל שורה נקראה מדפי מחזור החיים של ⁦Microsoft⁩ (דפי ה־release
health ודפי מחזור החיים של המוצרים) ומצטטת את הדף שלה: ⁦Windows Server⁩
מ־⁦2008 R2⁩ עד 2025, ⁦Windows⁩ 7, ‏8.1, ‏10 ו־11 לפי build ומהדורה
(⁦Enterprise⁩ ו־⁦Education⁩ לפי התאריכים שלהן, ⁦Home⁩ ו־⁦Pro⁩ לפי שלהן,
ומהדורות ⁦LTSC⁩ לפי שלהן).

| מצב | משמעות |
|---|---|
| נתמכת | הגרסה מקבלת עדכוני אבטחה גם אחרי 180 הימים הבאים |
| התמיכה מסתיימת | היום האחרון של העדכונים בתוך 180 ימים |
| ללא תמיכה | היום האחרון עבר — עדכוני אבטחה מורחבים בתשלום (⁦ESU⁩) לא נחשבים |
| לא ידוע | גרסה שאינה בטבלה (מערכת שאינה ⁦Windows⁩, שרת ⁦Annual Channel⁩, build ישן) — אף פעם לא ניחוש |

## תצוגת הספרייה

**ספרייה** (בסרגל הצד, תחת מלאי) מציגה כל מחשב ומדפסת שמקורות הספרייה
מחזיקים, עם המצב, מערכת ההפעלה והתמיכה, ההתחברות האחרונה, הבעלים והיחידה
הארגונית. המסננים עונים על השאלות שצוות ספרייה שואל:

- **לא פעילים** — ממוינים לפי ההתחברות האחרונה, הישנה ביותר קודם;
- **ללא תמיכה**;
- **מושבתים** — המחשבים המושבתים שעדיין במלאי;
- **יחידה ארגונית** — היחידה וכל יחידה שמתחתיה (*כל היחידות* מנקה את
  הבחירה).

כל מסנן מציג את המספר שלו; כל שם פותח את המכשיר, שבלשונית **מבט כללי** שלו יש
את אותן עובדות בכרטיס **ספרייה** (אחרי חלונית התיעוד). התצוגה נקראת ברמת
*צופה*: היא אף פעם לא מציגה את ההגדרות, הכתובת או פרטי ההתחברות של המקור.

## אתרים ורשתות

**Sites and Services** של ⁦AD⁩ ממקם מרחבי כתובות באתרים: כל אובייקט רשת
מציין אתר. הרשת של אתר היא צבירה מעצם הגדרתה — הרשתות המנותבות נמצאות
בתוכה — ולכן ⁦LanCompass⁩ מתכנן אותה ככזו:

- **כל רשת ⁦AD⁩ היא מכולה** באתר שלה, ריקה או לא. קידומת מנותבת מחומת
  אש, מ־⁦NetBox⁩ או מאדם נכנסת לתוכה, לא משנה איזה מקור מסתנכרן ראשון:
  אף צד כבר לא נדחה.
- **רשת ⁦AD⁩ שנמצאת בתוך קידומת של מקור אחר או של אדם** (‏⁦/20⁩ בתוך
  ⁦/16⁩ מנותב) לא נוצרת — הספרייה לעולם לא מפצלת קידומת שאינה שלה.
  הסקירה אומרת זאת — *„⁨10.88.0.0/20⁩ (אתר ⁦AD⁩ ⁨TelAviv-HQ⁩) נמצאת בתוך
  ⁨10.88.0.0/16⁩ — נשמרה כרמז לאתר”* — והרשת נשארת גלויה ב**ספרייה ←
  אתרים ורשתות** כרמז.
- **קידומת פעילה שהמקור הזה יצר קודם** (בגרסאות שלפני המכולות) הופכת
  למכולה בסנכרון הבא של המקור; המקור הוא הבעלים שלה, ולכן סנכרון של מקור
  אחר לעולם לא משנה אותה.
- **האתר של קידומת שבתוך רשת ⁦AD⁩** נקבע לפי רשת ה־⁦AD⁩ הארוכה ביותר
  שמכילה אותה: בקידומת שהספרייה היא הבעלים שלה, הסנכרון המתוזמן קובע
  אותו; בכל קידומת אחרת שאין לה אתר, הסקירה מציעה אותו (*למלא אתר ←
  ⁨TelAviv-HQ⁩?*) כדי שאדם יחליט. קידומת שכבר יש לה אתר לא משתנה לעולם —
  ההתאמה מראה היכן הם שונים.
- **⁦Default-First-Site-Name⁩**, האתר שכל ⁦AD⁩ מתחיל איתו, לא נוצר כל עוד
  אין בו רשת ואין בו בקר תחום (*„⁦Default-First-Site-Name⁩ דולג — אין בו
  רשת ואין בו בקר תחום”*). אם סנכרון מגרסה קודמת כבר יצר אותו, הסקירה
  הבאה מציגה אותו תחת **לא נמצא עוד** — השאירו אותו או מחקו אותו ידנית.

**ספרייה ← אתרים ורשתות** מציגה לכל רשת ⁦AD⁩: את אתר ה־⁦AD⁩ שלה, את
הקידומת שהיא ב־⁦LanCompass⁩ (או זו שהיא נמצאת בתוכה), את הקידומות שהיא
מכסה עם האתרים שלהן ב־⁦LanCompass⁩, ו**לא תואם** היכן שהאתר של קידומת
מכוסה אינו אתר ה־⁦AD⁩. *רק היכן שלא תואם* מצמצם לשורות האלה; כל קידומת
מקשרת לדף שלה, שבראשו כתוב *„אתר ⁦AD⁩: ⁨TelAviv-HQ⁩ (מתוך ⁨10.88.0.0/20⁩)”*.
יישבו אי־התאמה בדף הקידומת (קבעו את האתר שלה) או ב־⁦AD⁩.

## איתור בקרי התחום

תנו למקור את **הדומיין** ככתובת — `ldaps://corp.example.com` — והוא מאתר
את בקרי התחום שלו כפי שלקוחות ⁦Windows⁩ עושים, מרשומות האיתור ב־⁦DNS⁩:

1. `_ldap._tcp.<site>._sites.dc._msdcs.<domain>` — בקרי התחום של **אתר
   ה־⁦AD⁩ של השרת הזה** (*אתר ⁦AD⁩ של השרת הזה*, בשלב פרטי הגישה של
   המקור, מתוך האתרים ש**בדיקה** מציגה), ואחר כך
2. `_ldap._tcp.dc._msdcs.<domain>` — כל בקרי התחום של הדומיין, לפי
   העדיפות והמשקל של הרשומות,
3. הרשימה הידנית (*שרתי גיבוי*) כגיבוי, ושם הדומיין עצמו אחרון.

**בדיקה** מציגה את השורה הראשונה בסולם שלה: *„⁦DNS⁩ מונה ⁨3⁩ בקרי תחום
עבור ⁨corp.example.com⁩; מנסים קודם את ⁨dc1.corp.example.com⁩”*. כתובת
שמציינת בקר תחום (`ldaps://dc1.corp.example.com`) עובדת כמו קודם — ⁦DNS⁩
לא מונה רשומת איתור לשם של בקר תחום, ולכן נעשה שימוש בסדר הידני. כדי
לכבות את החיפוש, הגדירו `dc_discovery: false` בסקופ של המקור.

⁦LanCompass⁩ שואל את שרתי ה־⁦DNS⁩ שהשרת שלו מוגדר אליהם — בשרת שחבר
בדומיין, אלה בדרך כלל בקרי התחום. כל בקר תחום שנמצא עובר את אותו שומר
יציאה כמו בקר שהוקלד.

**מעבר לגיבוי.** כל בקר תחום מקבל **3 שניות** לענות. כשבקר התחום הראשון
בסדר לא עונה, זה שענה נוסה ראשון ב־15 הדקות הבאות (לכל מקור), בסנכרונים,
ב**בדיקה** ובהתחברות דרך הספרייה גם יחד — בקר תחום שנעצר עולה המתנה אחת
לכל 15 דקות לכל היותר, ולא המתנה לכל התחברות. כשהוא חוזר אין צורך לשנות
דבר: בתוך 15 דקות הסדר של האתר נוסה שוב.

## ⁦DNS⁩ מהספרייה

⁦Active Directory⁩ שומר את **אזורי ה־⁦DNS⁩ המשולבים בו** כאובייקטים
בספרייה, והמקור קורא אותם על אותו חיבור ⁦LDAP⁩ לקריאה־בלבד שכבר יש לו —
בלי העברת אזור, בלי הרשאה חדשה ובלי פרוטוקול חדש (מופעל כברירת מחדל;
`dns: false` בסקופ של המקור מכבה אותו). הוא קורא כל אזור בשלושת המקומות
שבהם ⁦AD⁩ שומר אותם — מחיצת ה־⁦DNS⁩ של התחום (`DC=DomainDnsZones,…`), זו
של היער (`DC=ForestDnsZones,…`) והמכל הישן (`CN=MicrosoftDNS,CN=System,…`)
— ומפענח את הרשומות של כל שם:

- רשומות **⁦A⁩, ⁦AAAA⁩ ו־⁦PTR⁩** הופכות לתצפיות על הכתובות שהן מציינות:
  השם נכנס כשם המחשב *שנצפה* בכתובת, וממלא את שם המחשב המתועד רק כשהוא
  ריק בכתובת שהספרייה עצמה יצרה. שם שמישהו נתן לא נדרס לעולם, ורשומה לא
  יוצרת כתובת לעולם.
- רשומות **⁦CNAME⁩** נשמרות כעובדות ⁦DNS⁩; כל סוג אחר (⁦SOA⁩, ⁦NS⁩,
  ⁦SRV⁩, ⁦MX⁩, ⁦TXT⁩ …) נספר ולא מנוחש. שם ש־⁦AD⁩ מחק (מסומן כמצבה) נשאר
  בחוץ.
- כל רשומה שומרת אם היא **סטטית** או **דינמית**, ולרשומה דינמית — מתי
  הלקוח שלה רענן אותה לאחרונה.
- כל אזור שומר את הגדרת העדכונים שלו (*⁦Secure only⁩*, *⁦Nonsecure and
  secure⁩*, *⁦None⁩*) — פרסום ⁦DNS⁩ קורא אותה כדי להסביר דחייה (ראו
  [כתיבת רשומות ⁦PTR⁩ לאזור ⁦AD⁩](/he/docs/integrations/#כתיבת-רשומות-ptr-לאזור-ad)).

**שם לכל כתובת.** כשהמקור קרא אזור הפוך, שם ה־⁦PTR⁩ של כל כתובת בא ממנו —
שום דבר לא נשאל כתובת אחר כתובת. בלי אזורים (`dns: false`, או ספרייה בלי
אזור הפוך) המקור שואל את בקר התחום, ⁨512⁩ כתובות בכל סנכרון, כל סנכרון
ממשיך מהמקום שבו הקודם עצר וחוזר להתחלה בסוף — כך שכל כתובת במעקב מקבלת
את שמה עם הזמן, ולא רק ⁨512⁩ הנמוכות.

**ספרייה ← ⁦DNS⁩** מציגה את השאלות שבעל ה־⁦DNS⁩ שואל, וכל שורה מקושרת
לכתובת שלה:

| רשימה | מה היא מציגה |
| --- | --- |
| **הרשומה הישירה וההפוכה אינן תואמות** | רשומת ⁦A⁩ או ⁦AAAA⁩ שה־⁦PTR⁩ של הכתובת שלה מציין מחשב אחר |
| **לא במלאי** | כתובת שרשומה מציינת ו־⁦LanCompass⁩ לא עוקב אחריה |
| **אין רשומת ⁦DNS⁩** | כתובת במעקב (בתוך טווחי ה־⁦PTR⁩ של המקור) שאף רשומה לא מציינת |
| **לא רועננה 14 ימים** | רשומה דינמית שהלקוח שלה לא רענן 14 ימים |

הדף של כתובת (המגירה) מציג מה ה־⁦DNS⁩ של הספרייה אומר עליה — *„רשומת
⁦DNS⁩: ⁨ws-0005.corp.example.com⁩ (⁦AD⁩, סטטית)”*, או *דינמית, רועננה לפני
3 ימים*.

## סייגים

- **קריאה־בלבד, לנצח.** חיבור ה־ldap3 נפתח עם `read_only=True`;
  כתיבות נדחות מבנית, לא רק נמנעות.
- חיפושים מדופדפים בלבד — דירקטוריים עם 10k+ מחשבים לעולם לא
  יראו קריאת single-shot.
- שמות ה־⁦PTR⁩ באים מהאזורים ההפוכים של הספרייה כשיש לה כאלה; אחרת
  העשרת ⁦PTR⁩ שואלת את בקר התחום על כתובות בטווחי ה־CIDRs המוגדרים —
  כולן כברירת מחדל, ⁨512⁩ בכל סנכרון לפי התור; כבו את מתג ה־PTR במקור
  כדי לחזור להתנהגות סריקה־בלבד, עם דריסות לכל סאבנט/אתר.
- אימות חי: הקונקטור פותח מול תגובות LDAP מדומות. לבדיקת smoke
  אמיתית, הקימו Samba-AD (`samba-tool domain provision`) או DC של
  Windows Server eval ב־VM, צרפו כמה חשבונות מחשב, והריצו את
  מסלול בדיקה → תצוגה מקדימה → החלה מולו.

## החלפת ה־⁦CA⁩ של הדומיין

כשה־⁦CA⁩ של הדומיין מחודש או מוחלף, השאירו את ⁦LDAPS⁩ פועל לאורך ההחלפה במקום לעבור ל־⁦LDAP⁩ פשוט:

1. ייצאו את תעודת השורש של ה־⁦CA⁩ החדש (`certutil -ca.cert new-root.cer`, ואז ⁦Base-64⁩) והדביקו אותה **מתחת** לישנה בשדה ה־⁦CA⁩ של המקור — ⁦PEM⁩ שמחזיק את שני ה־⁦CA⁩ מתקבל, ושניהם מהימנים.
2. תנו לכל ⁦DC⁩ לקבל את התעודה החדשה שלו (רישום אוטומטי, או `certreq` בכל ⁦DC⁩), והריצו *בדיקת חיבור*: שורת ה־⁦TLS⁩ בסולם מציינת לאיזה ⁦DC⁩ הגיעה.
3. כשכל ⁦DC⁩ עונה בתעודה מה־⁦CA⁩ החדש, הסירו את ה־⁦CA⁩ הישן מהשדה והריצו *בדיקת חיבור* שוב.

⁦DC⁩ שהתעודה שלו לא נושאת את השם שבכתובת של המקור נדחה בשורה אחת שמציינת את המארח ואת השמות שבתעודה: השתמשו באחד השמות האלה בכתובת, או בקשו להנפיק מחדש את התעודה עם השם.

## מה כל הודעה אומרת

| הודעה | מה היא אומרת ← מה עושים |
|---|---|
| *⁦bind⁩: בקר התחום דחה את הכניסה הלא חתומה (⁦strongerAuthRequired⁩)* | בקר התחום דורש חתימת ⁦LDAP⁩ ← העבירו את ההצפנה של המקור ל־⁦LDAPS⁩ או ל־⁦StartTLS⁩ (בקר התחום צריך תעודה) |
| *⁦tls⁩: התעודה של … מיועדת ל־…, לא ל־…* | הכתובת קוראת לבקר התחום בשם (או בכתובת) שאינם בתעודה שלו ← השתמשו באחד השמות שההודעה מונה, או הנפיקו את התעודה מחדש |
| *⁦tls⁩: … — אימות התעודה נכשל* | שדה ה־⁦CA⁩ לא מחזיק את ה־⁦CA⁩ שהנפיק את התעודה של בקר התחום ← הדביקו אותו; בזמן החלפת ⁦CA⁩ הדביקו את הישן ואת החדש |
| *⁦bind⁩: האימות נכשל … — בדקו את ה־⁦UPN⁩ של חשבון השירות* | החשבון או הסיסמה שגויים ← הזינו שוב `user@domain` או את ה־⁦DN⁩ המלא |
| *הסיסמה של חשבון השירות פגה* | הסנכרונים והכניסה דרך המדריך נעצרים ← החליפו את הסיסמה ב־⁦AD⁩ וכאן |
| *⁦basedn⁩: … לא ניתן לקריאה* | עקיפת ה־⁦base DN⁩ שגויה, או שהחשבון לא יכול לקרוא אותה ← נקו את העקיפה או תקנו את ההרשאות |
