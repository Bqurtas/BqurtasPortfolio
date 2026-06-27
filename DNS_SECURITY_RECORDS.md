# DNS security records for bqurtas.com

These records must be added in the DNS provider / registrar dashboard. They cannot be shipped by the website repository itself.

## Email authentication

Replace the current SPF TXT at `@`:

```dns
@  TXT  "v=spf1 include:spf.spacemail.com -all"
```

Replace the current DMARC TXT at `_dmarc`:

```dns
_dmarc  TXT  "v=DMARC1; p=quarantine; pct=100; rua=mailto:info@bqurtas.com; adkim=s; aspf=s"
```

After 2-4 weeks of clean DMARC reports, move to reject:

```dns
_dmarc  TXT  "v=DMARC1; p=reject; pct=100; rua=mailto:info@bqurtas.com; adkim=s; aspf=s"
```

Add SpaceMail DKIM. In Spaceship, copy the DKIM TXT value from the SpaceMail DNS setup screen / inactive SpaceMail DNS records. The selector is:

```dns
spacemail._domainkey  TXT  "v=DKIM1; k=rsa; p=<COPY_THE_SPACEMAIL_PUBLIC_KEY>"
```

## MTA-STS and TLS reports

The repository already publishes:

```text
https://bqurtas.com/.well-known/mta-sts.txt
```

Add these DNS TXT records:

```dns
_mta-sts    TXT  "v=STSv1; id=2026062701"
_smtp._tls  TXT  "v=TLSRPTv1; rua=mailto:info@bqurtas.com"
```

## CAA for Cloudflare Universal SSL

If Cloudflare is managing the public edge certificate, add CAA records that allow Cloudflare's current partner CAs:

```dns
@  CAA  0 issue     "pki.goog; cansignhttpexchanges=yes"
@  CAA  0 issuewild "pki.goog; cansignhttpexchanges=yes"
@  CAA  0 issue     "letsencrypt.org"
@  CAA  0 issuewild "letsencrypt.org"
@  CAA  0 issue     "ssl.com"
@  CAA  0 issuewild "ssl.com"
@  CAA  0 issue     "sectigo.com"
@  CAA  0 issuewild "sectigo.com"
@  CAA  0 iodef     "mailto:info@bqurtas.com"
```

## DNSSEC and registrar locks

Enable DNSSEC in Cloudflare, then copy the generated DS record to the domain registrar.

At the registrar, enable these domain lock statuses if available:

```text
clientDeleteProhibited
clientUpdateProhibited
```

## Current live gaps observed

As of 2026-06-27, live DNS showed:

```text
_dmarc.bqurtas.com  TXT  "v=DMARC1; p=none; rua=mailto:info@bqurtas.com"
bqurtas.com         TXT  "v=spf1 include:spf.spacemail.com ~all"
_mta-sts            missing
CAA                 missing
DNSSEC              not signed
```
