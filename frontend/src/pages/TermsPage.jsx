import LegalPageShell from '../components/LegalPageShell';

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Use"
      subtitle="Please read these terms carefully. By using this site, you agree to them."
      testId="terms-page"
    >
      <p><em>Last updated: August 2026</em></p>

      <h2>1. Nature of the service</h2>
      <p>
        The Lunar Birthright Project (the "Project", "we", "us") operates a <strong>symbolic, educational,
        and commemorative</strong> lunar registry. Nothing offered on this site — including but not limited to
        certificates, "plots", NFTs, share cards, and time-capsule messages — creates or represents any legal,
        real, transferable, or beneficial interest in the Moon or any other celestial body.
      </p>

      <h2>2. No ownership, no rights conferred</h2>
      <p>By claiming a certificate on this site you acknowledge and agree that:</p>
      <ul>
        <li>You are <strong>not</strong> acquiring legal ownership, title, or possessory rights of any kind.</li>
        <li>You are <strong>not</strong> acquiring mining, extraction, exclusion, occupation, or exploitation rights.</li>
        <li>You are <strong>not</strong> acquiring sovereignty, jurisdiction, or governance rights.</li>
        <li>You are <strong>not</strong> acquiring any real-estate, land, or leasehold interest.</li>
        <li>The Project respects the 1967 Outer Space Treaty. The Moon is not subject to national or private appropriation.</li>
      </ul>
      <p>
        Certificates and registry entries are <strong>commemorative and expressive</strong>. They serve as a
        symbolic acknowledgement of your imagined presence on the Moon and nothing more.
      </p>

      <h2>3. Free claim and optional upgrade</h2>
      <p>
        Anyone may claim one free symbolic quarter-acre plot. An optional Founding Lunar Citizen upgrade is
        offered at the price shown at checkout and includes a personalised PDF certificate, public registry
        record, dynamic share card, message-to-future preservation, and a commemorative NFT when NFT minting
        is available. The NFT is a digital collectible only: it is not a deed, security, investment product,
        or evidence of lunar ownership. Refund rights and consumer guarantees remain subject to applicable law.
      </p>

      <h2>4. NASA imagery & third-party content</h2>
      <p>
        Where NASA imagery (such as the LROC lunar mosaic) appears on this site it is used under NASA's
        public-domain terms and credited accordingly. Its use does not imply NASA endorsement of the Project.
      </p>

      <h2>5. Registry accuracy and content moderation</h2>
      <p>
        You are responsible for the accuracy of information you submit (name, country, message). We reserve
        the right to remove or refuse entries that contain hate speech, harassment, illegal content, spam,
        impersonation, or personal data of third parties without consent.
      </p>

      <h2>6. Referrals</h2>
      <p>
        Referral discounts, where offered, apply automatically at checkout when the corresponding referral
        threshold is met. Referral codes are not exchangeable for cash and may be modified or discontinued
        at any time.
      </p>

      <h2>7. Availability and modifications</h2>
      <p>
        We may modify, suspend, or discontinue parts of the service where reasonably necessary. We will use
        reasonable efforts to preserve existing certificate records and provide appropriate notice for material
        changes where practicable. Blockchain availability and third-party wallet/marketplace display are outside
        our direct control.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        The service is provided "as is" and "as available". To the fullest extent permitted by law, the
        Project disclaims all warranties, express or implied, and shall not be liable for any indirect,
        incidental, special, consequential, or exemplary damages arising out of or relating to your use of
        the site or any certificate issued by it.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of New Zealand (the founder's jurisdiction), without regard to
        conflict-of-laws principles. Any dispute shall be resolved in the courts of that jurisdiction.
      </p>

      <h2>10. Contact</h2>
      <p>Questions about these Terms can be sent to us via the contact channels linked on the homepage.</p>
    </LegalPageShell>
  );
}
