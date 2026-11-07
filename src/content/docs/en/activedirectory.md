---
title: "Active Directory"
description: "Read-only LDAP sync from a Domain Controller — computer objects, AD sites/subnets, and DC-as-resolver PTR hostname enrichment."
category: "integrations"
version: "0.7.0"
order: 52
---

# Active Directory

One directory connection feeds three enrichment channels:

1. **Computer objects → devices** — `dNSHostName`, `operatingSystem`,
   `operatingSystemVersion`, `whenCreated`/`whenChanged`, `description`.
   The UAC and OS fields classify each row as domain controller, server,
   workstation, or generic computer.
2. **AD Sites & Services → sites/subnets** — AD itself stores the
   site↔subnet mapping under `CN=Subnets,CN=Sites,CN=Configuration,…`,
   so real topology syncs without anyone typing it by hand.
3. **DC-as-resolver PTR enrichment** — the DC is almost always the DNS
   server. Scanner-found addresses with no hostname are PTR-queried
   against the DC and resolved names land on the address with
   `Active Directory` provenance.

The connector is AD-first but speaks standard LDAP — FreeIPA, OpenLDAP,
and Samba-AD aren't excluded by design (untested at launch).

## Read-only role

*Checked against Active Directory at functional level 2016 and later (the lab: Samba 4.22 as a Windows-compatible DC).*

1. Create `svc-lancompass` in a *Service Accounts* OU, a member of *Domain Users* only — not *Account Operators*, not *Domain Admins*: every authenticated user can read computers, sites and subnets, users and groups, which is all LanCompass reads.
2. Give it a password of 25 characters or more and note when it must change — LanCompass warns 14 days before it expires.
3. Deny it interactive and Remote Desktop sign-in by Group Policy (*Deny log on locally*, *Deny log on through Remote Desktop Services*).
4. Export your CA's root certificate (`certutil -ca.cert root.cer`, then Base-64) and paste it into the source's CA field; use `ldaps://` (port 636) or StartTLS. A domain controller that requires LDAP signing refuses an unsigned simple bind; a simple bind over TLS is accepted.
5. Do not grant read on the LAPS attributes (`ms-Mcs-AdmPwd`, `msLAPS-Password`, `msLAPS-EncryptedPassword`) — LanCompass never reads them.
6. Name the domain in the URL (`ldaps://corp.example.com`) to find every DC through DNS, or list them under *Servers*.

**What LanCompass reads:** the RootDSE, computer objects, Sites and Services (sites, subnets), the printers' print queues, the AD-integrated DNS zones' records and, for a few addresses, PTR answers — searches and reads only, never a write.

## Before you start

- **A service account with read access.** The connector is read-only
  against the directory — it never issues LDAP modify/add/delete —
  but least-privilege still applies on the AD side. A plain
  *Domain Users* member is enough for computer/site/subnet reads.
- **LDAPS or StartTLS reachability** — TCP/636 or TCP/389 from LanCompass.
- **Your internal CA certificate** if the DC's cert chains to AD CS
  (it almost always does). PEM paste, no file upload needed.

Never done this before? The next section walks each value end to end —
every command runs on a domain-joined Windows box or the DC itself.

## Collecting the values from Active Directory

> [!details] One-click collector script — run elevated on your DC (optional)
>
> Paste into an elevated PowerShell window on the DC (save as `Collect-
> LanCompassAD.ps1`, then `.\Collect-LanCompassAD.ps1`). It prints a fill-in card for
> every LanCompass field, runs a live TLS handshake probe on 636, exports the CA
> chain to `LanCompass-CA.pem` on your Desktop, and lists sites, subnets and
> reverse zones. Read-only — add `-CreateServiceAccount` only if you also want
> it to create the `svc-ipam` bind account.
>
> If no TLS cert exists, it offers an interactive fix — self-signed
> cert (recommended) or relax LDAP signing (lab); `-NonInteractive`
> keeps it read-only for automation.
>
> ```powershell
> <#
> .SYNOPSIS
>     Collects everything LanCompass needs for an Active Directory source.
>     Run on a Domain Controller in an elevated PowerShell session.
> .PARAMETER CreateServiceAccount
>     Optional: also creates the read-only bind account and asks for
>     its password interactively.
> .PARAMETER NonInteractive
>     Skip the TLS-fix menu — the script only reports, never changes the DC.
> .PARAMETER OutDir
>     Where to write LanCompass-AD-Report.txt and LanCompass-CA.pem.
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
>         $ssl.AuthenticateAsClient($targetFqdn)   # SNI = our FQDN, like LanCompass does
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
> Row "defaultNamingContext" $rootDSE.defaultNamingContext   # <-- LanCompass 'Base DN' field
> Row "configurationNaming"  $rootDSE.configurationNamingContext
> Row "schemaNaming"         $rootDSE.schemaNamingContext
> # Sign-in readiness (V28): LanCompass uses simple binds over TLS — a DC
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
>     $pemPath = Join-Path $OutDir "LanCompass-CA.pem"
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
>              -CannotChangePassword $true -Description "Read-only LanCompass LDAP bind account" -PassThru
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
> Section "★ LanCompass fill-in card ★"
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
> $rpt = Join-Path $OutDir "LanCompass-AD-Report.txt"
> $report | Set-Content $rpt -Encoding utf8
> Write-Host "`nReport saved to $rpt" -ForegroundColor Green
> Write-Host "Copy the card values into Settings → Integrations → New source → Active Directory." -ForegroundColor Green
> ```

### Find the domain controller's address

Easiest shortcut: the DC is almost always your DNS server.

- **From any domain workstation** — `ipconfig /all`: the *DNS Servers*
  line is typically a DC's address.
- **Ask the domain which DC answered you** —
  `nltest /dsgetdc:%USERDNSDOMAIN%` (CMD · PowerShell: `$env:USERDNSDOMAIN`) prints `\\DC01.corp.local` and its
  address.
- **Ask DNS for every DC** —
  `nslookup -type=SRV _ldap._tcp.dc._msdcs.corp.local` (PowerShell: `Resolve-DnsName _ldap._tcp.dc._msdcs.corp.local -Type SRV`) lists all DCs;
  the extras become your failover servers.
- **Or look at the map** — `dssite.msc` (Active Directory Sites and
  Services) → expand a site → *Servers* shows its DCs.

Form value: `ldaps://dc01.corp.local`. An IP works too
(`ldaps://10.0.0.10`), but the TLS certificate must name what you type —
certificates are issued for names, so prefer the FQDN.

### Find your Base DN

The Base DN is the domain name rewritten in LDAP notation — split on
the dots and prefix each part with `DC=`:

`corp.local` → `DC=corp,DC=local` · `hq.example.com` →
`DC=hq,DC=example,DC=com`

To look it up instead of deriving it:

- `echo %USERDNSDOMAIN%` (CMD · PowerShell: `$env:USERDNSDOMAIN`) on a domain box shows the FQDN to convert.
- PowerShell: `(Get-ADDomain).DistinguishedName` prints the DN exactly.
- Or ask the directory itself: `ldp.exe` → *Connection → Connect* →
  *Connection → Bind*, then *View → Tree* — the dropdown lists the
  naming contexts.

You can also just leave Base DN empty — the connector auto-discovers
`defaultNamingContext` from RootDSE. The field only matters for
scoping the sync to a subtree.

### Create the read-only service account

Any ordinary domain account can read computer objects and the Sites &
Services configuration — no admin rights needed. A dedicated account
is still worthwhile: revoking it retires the integration cleanly.

1. Open **Active Directory Users and Computers** (`dsa.msc`) → your
   domain → *Users* → right-click → *New → User*.
2. Name it something self-describing — `svc-ipam` — set a strong
   password, tick *Password never expires*, untick *User must change
   password at next logon*.
3. Nothing else to grant — the default *Domain Users* membership is
   already enough for reads.

Bind identity in the form: `svc-ipam@corp.local` (UPN — simplest) or
the full DN `CN=svc-ipam,CN=Users,DC=corp,DC=local`.

PowerShell equivalent:

```powershell
New-ADUser svc-ipam -Enabled $true `
  -AccountPassword (Read-Host -AsSecureString "Password") `
  -PasswordNeverExpires $true -CannotChangePassword $true
```

### Check the encryption path

- **LDAPS (636)** — `Test-NetConnection dc01.corp.local -Port 636`.
  `TcpTestSucceeded: True` means the DC already serves TLS (it does
  once it holds a server-auth certificate — AD CS enrols one
  automatically).
- **StartTLS (389)** — same test against 389, which is nearly always
  open; the connection starts cleartext and upgrades before the bind.
- **Plain (389)** — same port, no TLS at all. Lab-only, and the form
  requires the explicit acknowledgement checkbox.

### Get the internal CA certificate

If TCP/636 answers but the TLS step reports an untrusted chain, the
DC's certificate was issued by your internal CA (usually AD CS) —
LanCompass needs that CA's *public* certificate in PEM form. It's a
public object, not a secret.

- **CA web enrolment (easiest)** — browse `http://<ca-server>/certsrv`
  → *Download a CA certificate, certificate chain, or CRL* → choose
  the CA → *Base 64* → download. That file is already PEM — paste it
  straight into the form.
- **On the CA itself** — `certutil -ca.cert ca.cer` writes the CA cert
  in DER; convert to PEM with `certutil -encode ca.cer ca.pem`.
- **Off the wire** —
  `openssl s_client -connect dc01.corp.local:636 -showcerts` prints the
  presented chain; the last `-----BEGIN CERTIFICATE-----` block is the
  issuing CA. Copy that block verbatim.

### Where the sites and subnets come from

`dssite.msc` → *Sites* is exactly what the connector reads: every site
object, and under *Subnets* each `subnet ↔ site` binding. Whatever is
visible there is what appears in the preview diff — nothing is
invented.

### Preview what the computer channel sees

`Get-ADComputer -Filter * -Properties DNSHostName,OperatingSystem` is
close to what lands in the plan — `dNSHostName` wins; the bare `name`
is the fallback.

## Step 1 — Add the source

Settings → Integrations → **Add source** → kind **Active Directory**.

- **LDAP URI** — `ldaps://dc1.corp.local` (or `ldap://` when pairing
  with StartTLS/plain). This is the primary server. Or give the domain
  itself (`ldaps://corp.local`): the DCs are then found in DNS, this
  server's site first (§ Finding the DCs).
- **Failover servers** — extra DC URIs, tried in order when the
  primary is unreachable (after the DCs DNS lists, when it lists any).
- **Encryption**:
  - `LDAPS` — default, TLS from connect. Recommended.
  - `StartTLS` — upgrade on port 389 before bind. Same verification.
  - `Plain LDAP` — opt-in only. Shows a cleartext warning and
    requires the *I understand* checkbox before Test enables; the
    sources list then flags the source with an insecure badge.
    "Skip TLS verification" is deliberately not offered — plaintext
    is the escape hatch, not blind TLS.
- **Internal CA (PEM)** — paste the issuing CA cert so the DC's
  AD CS-issued certificate verifies.
- **Bind identity** — service account as DN
  (`CN=svc-ipam,OU=Service,DC=corp,DC=local`) or UPN
  (`svc-ipam@corp.local`) + password. Stored encrypted, never
  returned by the API.
- **Base DN** — leave empty to auto-discover `defaultNamingContext`
  from RootDSE; set it (e.g. `OU=Sites,DC=corp,DC=local`) to scope
  the sync to a subtree.

## Step 2 — Scope

- **Channels** — computers, sites/subnets, hostname enrichment (PTR).
- **Site scope** — tick which AD sites sync their subnets. Computers
  carry no site attribute in AD, so the device channel is unscoped.
- **PTR CIDRs** — which addresses are eligible for enrichment.
  Defaults to the RFC1918 ranges the IPAM tracks
  (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) — private
  reverse zones a DC actually hosts, not a PTR-blast at public IPs.

PTR resolves *every* tracked address in scope by default — the
**Resolve all addresses** switch on the source — not just
scanner-found hostname-less ones; drift against stored hostnames
surfaces as conflicts, and ownership rules still protect
manual/import values. Untick it for scanner-only behavior, or use
the **AD PTR enrichment** tri-state on a subnet (subnet page or
edit dialog) or site (site dialog): a subnet's flag wins over the
site's, and both override the source default.

## Step 3 — Test

The test ladder walks five designed rows (after a **DNS** row when the
URL names a domain whose DCs DNS lists — § Finding the DCs):

1. **TCP** — socket reachability per server URI (failover notes which
   host answered when a later URI wins).
2. **TLS** — handshake for `ldaps`, or the StartTLS upgrade on 389.
3. **Bind** — auth. A failure suggests checking the UPN format
   `user@domain` vs. a full DN.
4. **Base DN** — the configured or discovered naming context is
   readable.
5. **Sample** — each enabled channel runs a bounded probe search.

> [!tip] TCP timeout but `Test-NetConnection` works from your PC?
>
> Docker resolves names via the host's DNS — a lab domain that also exists as
> a parked public domain resolves to a placeholder IP. Pin the real DC in
> `docker-compose.override.yml`:
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
> The repo ships `docker-compose.override.example.yml` — copy it and
> edit the values (the real file stays out of git). Apply with
> `docker compose up -d`. Or use the DC's IP in the URI for plain LDAP
> (TLS needs the FQDN to match the certificate).

> [!warning] `strongerAuthRequired` on the Bind step?
>
> Windows Server 2025 DCs enforce LDAP signing by default — a plain
> simple bind is refused before the password is even checked. Fix it on
> the DC, then hit **Retry**.

**Recommended — a server-auth certificate on the DC, then LDAPS.**
Easiest: re-run the collector and pick option 1. Or by hand — elevated
PowerShell on the DC:

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

Re-run the collector — the handshake probe turns green and it exports
the certificate as your **Internal CA PEM**. Then switch the source to
`ldaps://dc01.corp.local` / Encryption **LDAPS**.

If the probe still fails after the NTDS restart, reboot the DC —
Schannel loads the new cert reliably at boot.

> [!details] Lab only — relax LDAP signing on the DC
>
> Re-run the collector and pick option 2 — or set it by hand:
> `LDAPServerIntegrity=1` allows unsigned binds, then restarts AD DS.
> Credentials and all LDAP traffic stay plaintext on the wire — don't do
> this outside a lab.
>
> ```powershell
> Set-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Services\NTDS\Parameters -Name LDAPServerIntegrity -Value 1
> Restart-Service NTDS -Force
> ```
>
> Re-enable enforcement with `-Value 2` and another restart.

## Step 4 — Preview and apply

Preview shows the standard diff: new/matched/conflict rows for sites,
subnets, devices, and hostname updates on existing addresses. Subnet
rows resolve their `site` name to the site row — new sites are
created first so subnets land attached.

## Step 5 — Schedule

Standard cadence. AD topology changes slowly — a daily sync is a
sensible default.

## Signing in with Active Directory

The same source doubles as the sign-in directory — no second
connection to configure, no second CA PEM to drift. In
**Settings → Security → Directory authentication**:

- **Enable directory sign-in** and pick this source as the provider —
  servers, failover, encryption and the service account all come from
  it.
- **User search base/filter** — the defaults cover standard AD. The
  filter `(|(sAMAccountName={u})(userPrincipalName={u}))` accepts
  both `user` and `user@domain`; `{u}` is the submitted username.
- **Group → role mapping** — JSON like `{"Domain Admins": "admin",
  "Help Desk": "operator"}`. Group names and full DNs both match, and
  nested groups resolve through the `LDAP_MATCHING_RULE_IN_CHAIN`
  rule.
- **Fallback role** — the role authenticated users get when no group
  matches; pick *Deny* to require a mapping.

**Test a user** answers the integration question without logging in:
enter a username and the ladder reports the service bind, the resolved
DN, the group list and the resulting role — a "no group mapping"
verdict is distinct from "user not found".

On the login page, users pick **Local account** or **Active
Directory**. The first successful directory sign-in provisions the
account (username from `sAMAccountName`, display name and email from
the directory); the submitted password is used for the bind and
discarded — only the service account is ever stored. Failed sign-ins
share the local lockout policy.

Conflict rules: the stored sign-in source wins. A local admin can
re-source a user in **Settings → Users** — converting to local needs
a password set in the same save. That conversion is also the
break-glass path when the DC is down: directory sign-in fails closed
("directory unreachable"), local sign-in is unaffected. Keep one local
admin account for exactly this case.

Who may sign in, roles by SID and how a leaver loses access within minutes:
[Single sign-on → Who may sign in](/docs/sso/#who-may-sign-in),
[Roles by SID](/docs/sso/#roles-by-sid) and
[Deprovisioning](/docs/sso/#deprovisioning).

## The service account's expiry

Every **Test** and every sync read the bind account's own `pwdLastSet`,
`accountExpires` and `msDS-UserPasswordExpiryTimeComputed` (the date AD
computes from the domain's password policy). The earlier of the two dates
is when the account stops working:

- **Two weeks before**, the source says so — on its row in Settings →
  Integrations, in its channel detail, and in Test's *Service account*
  line: *“The service account's password expires in {days} days
  ({date})”*. Change the password (or set *Password never expires*, as
  [the service account](#create-the-read-only-service-account) above
  recommends) before then.
- **Once it has expired**, the bind fails and LanCompass says so instead
  of *invalidCredentials*: Test, preview and sync answer *“The service
  account's password has expired — syncs and directory sign-in stop until
  it is changed”*, and a person signing in with the directory reads
  *“Directory sign-in is unavailable: LanCompass's own directory account
  cannot sign in — tell an administrator”* (not *directory unreachable*).
  AD's own reason for a refused bind (password expired, account expired,
  must change the password) is read too, so this holds even when the date
  was never read.

## What the directory brings

Every sync reads **every computer object** of the base DN — up to 50,000
(past that, the sync says it stopped and how many it read, and stays
*partial*; it never cuts silently). For each computer LanCompass keeps
what the directory says beside the device, without changing what a person
wrote:

| Directory attribute | Where it goes |
|---|---|
| `dNSHostName` (else `name`) | the device's name |
| `userAccountControl` | its **state** (enabled, stale, disabled) and its type: a domain controller, and a **read-only domain controller** (an RODC is a domain controller, marked as read-only) |
| `operatingSystem`, `operatingSystemVersion` | the **operating system** and its **support** status — never the *Model* field (a model is hardware). A model an older sync wrote as the OS string is cleared on the source's own devices only |
| `lastLogonTimestamp` | the **last logon** |
| `managedBy` | the **owner**, by the name the directory shows for that account |
| `location`, the DN | the **location** and the **OU**, read top-down (*LCIX / מחשבים / תל אביב*) |
| `description` | the device's **notes** when they are empty and the device is the source's own (a person's notes are never touched); always on the directory card |
| `whenCreated`, `whenChanged` | **created** and **changed** |
| `pwdLastSet`, `servicePrincipalName` | kept with the rest (the services a computer's SPNs name) |
| `objectGUID` | the object's id for life — a renamed or moved computer stays one device |

**Disabled computers** are never created. One the inventory already holds
(created by an earlier sync, or matched by name) appears in the source's
next review under **Gone from {source}** as *Disabled in {source}*, with
**Retire** or **Keep** — a schedule never retires it. Each review notes how
many disabled computers it did not create.

**Managed service accounts** (group-managed and standalone) are computer
objects in AD but not computers: they are never devices, and the review
names them — *“2 service accounts skipped (not computers)”*.

**Printers.** The print queues the directory publishes (`printQueue`)
become devices of type *printer*, with the server, share, driver and
location. A queue whose port is named after an IPv4 address (`10.0.0.5` or
`IP_10.0.0.5`) carries that address: it is linked to the printer when both
rows are the source's, and offered to a person otherwise (the link rule of
every source).

Every read is a read: the connection is opened read-only, and a full sync
leaves every DC's `highestCommittedUSN` where it was.

## Stale and support

A computer is **stale** when it is enabled and its last logon is older than
the source's line — **90 days** unless the source sets another
(*Stale after (days without a logon)*, 30 to 3,650, on the source's
**Connection** step). A computer that never signed in is stale once it was created
before the line. `lastLogonTimestamp` reaches every DC only every 9 to 14
days by AD's design, so a line under 30 days would mark live machines.
A stale computer is created and kept like any other; it is marked, never
hidden and never retired by LanCompass.

The **support** status comes from a table of Windows client and server
releases kept in LanCompass, each row read from Microsoft's lifecycle
pages (the Windows release-health pages and the product lifecycle pages)
and citing its page: Windows Server 2008 R2 to 2025, Windows 7, 8.1, 10 and
11 by build and edition (Enterprise and Education follow their own dates,
Home and Pro theirs; LTSC editions theirs).

| Status | Meaning |
|---|---|
| Supported | the release gets security updates past the next 180 days |
| Support ending | its last day of updates is within 180 days |
| Out of support | its last day has passed — paid Extended Security Updates do not count |
| Unknown | a release the table does not hold (a non-Windows system, an Annual Channel server, an old build) — never guessed |

## The directory view

**Directory** (in the side bar, under Inventory) lists every computer and
printer the directory sources hold, with its state, operating system and
support, last logon, owner and OU. Its filters answer the questions a
directory team asks:

- **Stale** — sorted by last logon, the oldest first;
- **Out of support**;
- **Disabled** — the disabled computers the inventory still holds;
- **an OU** — the OU and every OU under it (*All OUs* clears it).

Each filter shows its count; each name opens the device, whose **Overview**
has the same facts as its **Directory** card (after the Documentation
panel). The view is read at the *viewer* level: it never shows the
source's settings, URL or credentials.

## Sites and subnets

AD's **Sites and Services** places address space on sites: each subnet
object names a site. A site's subnet is an aggregate by design — the
routed networks live inside it — so LanCompass plans it as one:

- **Every AD subnet is a container** on its site, empty or not. A routed
  prefix from a firewall, from NetBox or from a person lands inside it,
  whichever source syncs first: neither side is refused any more.
- **An AD subnet inside a prefix another source or a person owns** (a
  /20 inside a routed /16) is not created — the directory never splits a
  prefix it does not own. The review says so — *“10.88.0.0/20 (AD site
  TelAviv-HQ) is inside 10.88.0.0/16 — kept as a site hint”* — and the
  subnet stays visible in **Directory → Sites and subnets** as a hint.
- **An active prefix this source created before** (versions before the
  containers) becomes a container at the source's next sync; the source
  owns it, so no other source's sync ever changes it.
- **The site of a prefix inside an AD subnet** follows the longest AD
  subnet that holds it: on a prefix the directory owns, its schedule sets
  it; on every other prefix with no site the review offers it (*fill site
  → TelAviv-HQ?*), for a person to take. A prefix whose site is already
  set is never changed — the reconciliation shows where they differ.
- **Default-First-Site-Name**, the site every AD starts with, is not
  created while it holds no subnet and no DC (*“Default-First-Site-Name
  skipped — it holds no subnet and no DC”*). If a sync before this version
  created it, the next review lists it under **Gone** — keep it or delete
  it by hand.

**Directory → Sites and subnets** shows, for every AD subnet: its AD site,
the prefix it is in LanCompass (or the one it sits inside), the prefixes
it covers with their LanCompass sites, and **Disagrees** where a covered
prefix's site is not the AD site. *Only where they disagree* narrows it to
those rows; each prefix links to its page, whose header says *“AD site:
TelAviv-HQ (from 10.88.0.0/20)”*. Settle a disagreement on the prefix's
page (set its site), or in AD.

## Finding the DCs

Give the source the **domain** as its URL — `ldaps://corp.example.com` —
and it finds its domain controllers the way Windows clients do, from
DNS's locator records:

1. `_ldap._tcp.<site>._sites.dc._msdcs.<domain>` — the DCs of **this
   server's AD site** (*This server's AD site*, on the source's
   Credentials step, chosen from the sites **Test** lists), then
2. `_ldap._tcp.dc._msdcs.<domain>` — every DC of the domain, by the
   records' priority and weight,
3. the hand-kept list (*Failover servers*) as a fallback, and the
   domain name itself last.

**Test** shows the first line of its ladder: *“DNS lists 3 DCs for
corp.example.com; trying dc1.corp.example.com first”*. A URL that names a
DC (`ldaps://dc1.corp.example.com`) works as before — DNS lists no locator
record for a DC's own name, so the hand-kept order is used. To turn the
lookup off, set `dc_discovery: false` in the source's scope.

LanCompass asks the DNS servers its host is configured with — on a domain
member, those are usually the DCs. Each DC it finds passes the same
outbound guard as a typed one.

**Failover.** Each DC gets **3 seconds** to answer. When the first DC in
the order does not answer, the one that did is tried first for the next
15 minutes (per source), for syncs, **Test** and directory sign-in alike —
a stopped DC costs one wait every 15 minutes at most, not one per
sign-in. Once it is back, nothing has to change: within 15 minutes the
site's own order is tried again.

## DNS from the directory

Active Directory keeps its **AD-integrated DNS zones** as directory
objects, and the source reads them over the same read-only LDAP
connection it already has — no zone transfer, no new right, no new
protocol (on by default; `dns: false` in the source's scope turns it
off). It reads every zone under the three places AD keeps them — the
domain's DNS partition (`DC=DomainDnsZones,…`), the forest's
(`DC=ForestDnsZones,…`) and the legacy container
(`CN=MicrosoftDNS,CN=System,…`) — and decodes each name's records:

- **A, AAAA and PTR** records become observations on the addresses they
  name: the name lands as the address's *observed* hostname, and fills
  the curated hostname only where it is empty on an address the directory
  itself created. A name someone gave is never overwritten, and a record
  never creates an address.
- **CNAME** records are kept as DNS facts; every other type (SOA, NS,
  SRV, MX, TXT …) is counted, never guessed at. A name AD has deleted
  (tombstoned) is left out.
- Each record keeps whether it is **static** or **dynamic**, and for a
  dynamic one when its client last refreshed it.
- Each zone keeps its update setting (*Secure only*, *Nonsecure and
  secure*, *None*) — DNS publishing reads it to explain a refusal (see
  [Writing PTR records to an AD zone](/docs/integrations/#writing-ptr-records-to-an-ad-zone)).

**Names for every address.** When the source has read a reverse zone,
every address's PTR name comes from it — nothing is asked address by
address. Without zones (`dns: false`, or a directory with no reverse
zone) the source asks the DC, 512 addresses per sync, each sync
continuing where the last one stopped and wrapping around at the end, so
every tracked address gets its name in time — not only the lowest 512.

**Directory → DNS** lists the questions a DNS owner asks, each row linked
to its address:

| List | What it shows |
| --- | --- |
| **Forward and reverse disagree** | an A or AAAA record whose address's PTR names another host |
| **Not in the inventory** | an address a record names that LanCompass does not track |
| **No DNS record** | a tracked address (inside the source's PTR CIDRs) that no record names |
| **Not refreshed in 14 days** | a dynamic record its client has not refreshed for 14 days |

An address's page (the drawer) shows what the directory's DNS says about
it — *“DNS: ws-0005.corp.example.com (AD, static)”*, or *dynamic,
refreshed 3 days ago*.

## Caveats

- **Read-only, forever.** The ldap3 connection is opened with
  `read_only=True`; writes are refused structurally, not just avoided.
- Paged searches only — directories with 10k+ computers never see a
  single-shot read.
- PTR names come from the directory's reverse zones when it has them;
  otherwise PTR enrichment asks the DC about tracked addresses inside the
  configured CIDRs — all of them by default, 512 per sync in turn; untick
  the source's PTR switch for scanner-only behavior, with
  per-subnet/per-site overrides.
- Live verification: this connector was developed against mocked
  LDAP responses. For a real smoke test, stand up a Samba-AD
  (`samba-tool domain provision`) or a Windows Server eval DC in a
  VM, join a couple of machine accounts, and run the test → preview
  → apply journey against it.

## Rotating the directory's CA

When the domain's CA is renewed or replaced, keep LDAPS working through the change instead of switching to plain LDAP:

1. Export the new CA's root certificate (`certutil -ca.cert new-root.cer`, then Base-64) and paste it **below** the old one in the source's CA field — a PEM holding both CAs is accepted, and both are trusted.
2. Let each DC enroll its new certificate (auto-enrollment, or `certreq` on each DC), and run *Test connection*: the ladder's TLS row names the DC it reached.
3. Once every DC answers with a certificate from the new CA, remove the old CA from the field and run *Test connection* again.

A DC whose certificate does not carry the name in the source's URL is refused on one line that names the host and the certificate's names: use one of those names in the URL, or have the certificate reissued with the name.

## What each message means

| Message | What it means → what to do |
|---|---|
| *bind: DC refused the unsigned bind (strongerAuthRequired)* | the DC requires LDAP signing → switch the source's encryption to LDAPS or StartTLS (the DC needs a certificate) |
| *tls: the certificate of … is for …, not …* | the URL names the DC by a name (or an address) its certificate does not hold → use one of the names the message lists, or have the certificate reissued |
| *tls: … — certificate verify failed* | the CA field does not hold the CA that issued the DC's certificate → paste that CA; during a CA change paste the old and the new one |
| *bind: authentication failed … — check the service-account UPN* | the account or its password is wrong → enter `user@domain` or its full DN again |
| *The service account's password has expired* | syncs and directory sign-in stop → change the password in AD and here |
| *basedn: … not readable* | the base DN override is wrong, or the account cannot read it → clear the override or fix its rights |
