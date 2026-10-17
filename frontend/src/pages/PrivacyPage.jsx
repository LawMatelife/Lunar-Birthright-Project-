import LegalPageShell from '../components/LegalPageShell';

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="Simple, honest, and respectful of your data."
      testId="privacy-page"
    >
      <p><em>Last updated: August 2026</em></p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Registration data:</strong> full name, country, email address, and a password used to secure your account. Passwords are stored only as a one-way hash.</li>
        <li><strong>Message to the future:</strong> the text you optionally leave in the time capsule.</li>
        <li><strong>Payment data:</strong> processed by Stripe. We never see your full card number; we receive the payment/session status and transaction metadata needed to fulfil your purchase.</li>
        <li><strong>Referral data:</strong> which citizen referred you (if any), and how many people you have referred.</li>
        <li><strong>Analytics:</strong> privacy-minimised page-view and interaction events (e.g. via PostHog) for product improvement; session recording is disabled.</li>
      </ul>

      <h2>2. What we do with it</h2>
      <ul>
        <li>Create and display your public registry entry (first name, country, optional message).</li>
        <li>Send you your certificate and, if you opt in, occasional Project updates.</li>
        <li>Improve the site (bug fixes, UX, security).</li>
        <li>Aggregate anonymised statistics such as "total citizens" and "countries represented".</li>
      </ul>

      <h2>3. What we DO NOT do</h2>
      <ul>
        <li>We do <strong>not</strong> sell your personal data.</li>
        <li>We do <strong>not</strong> share individual data with advertisers.</li>
        <li>We do <strong>not</strong> publicly display your email, password, IP address, or payment details.</li>
      </ul>

      <h2>4. Public information</h2>
      <p>
        The public registry shows your <strong>first name and country</strong> alongside your plot coordinates
        and (if you leave one) your message to the future. This is the entire point of the registry — to
        celebrate collective humanity. Please do not include personal contact details, addresses, or
        third-party personal data in your message.
      </p>

      <h2>5. Cookies &amp; login</h2>
      <p>
        We use a single <strong>httpOnly authentication cookie</strong> to keep you logged in. This cookie is
        essential to the service and is not used for tracking or advertising. Analytics is provided by
        PostHog and follows privacy-friendly defaults (identified profiles only after signup).
      </p>

      <h2>6. Data retention &amp; deletion</h2>
      <p>
        Your registry entry is kept as long as you remain a citizen. You may request deletion at any time
        by contacting us — we will remove your personal data and reduce your registry entry to an anonymised
        placeholder (e.g. "A citizen of Earth"). Payment records are retained as required by law.
      </p>

      <h2>7. Third-party services</h2>
      <ul>
        <li><strong>Stripe</strong> — payment processing.</li>
        <li><strong>Resend</strong> — transactional email delivery (welcome, receipt).</li>
        <li><strong>PostHog</strong> — privacy-minimised product analytics; session recording is disabled.</li>
        <li><strong>Crossmint</strong> — NFT minting and email-based wallet delivery for Founding upgrades.</li>
        <li><strong>MongoDB Atlas</strong> — hosted database.</li>
        <li>NASA imagery is served from the site itself; no data is sent to NASA.</li>
      </ul>

      <h2>8. Children</h2>
      <p>
        The service is not directed to children under 13. If you are a parent and believe your child has
        registered, please contact us and we will remove the account.
      </p>

      <h2>9. Your rights</h2>
      <p>
        You may access, correct, export, or delete your personal data at any time. Contact us via the
        homepage links and we'll help.
      </p>

      <h2>10. Changes</h2>
      <p>We may update this Privacy Policy from time to time. Material changes will be highlighted on this page.</p>
    </LegalPageShell>
  );
}
