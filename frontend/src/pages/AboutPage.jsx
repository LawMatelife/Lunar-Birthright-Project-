import LegalPageShell from '../components/LegalPageShell';

export default function AboutPage() {
  return (
    <LegalPageShell
      title="About the Lunar Birthright Project"
      subtitle="A peaceful, educational, commemorative lunar registry — inspired by NASA imagery and the Outer Space Treaty."
      testId="about-page"
    >
      <p>
        The Lunar Birthright Project is a global, symbolic registry that invites every human being on Earth to
        claim a named quarter-acre plot on the Moon and leave a message to the future. It is a purely
        commemorative act — an invitation to imagine ourselves collectively on the Moon.
      </p>

      <h2>What this is</h2>
      <ul>
        <li>A public, symbolic registry of lunar citizens from countries around the world.</li>
        <li>A creative, educational exercise inspired by NASA imagery and space history.</li>
        <li>A shared time capsule of messages to the future.</li>
        <li>A place to celebrate our common humanity beyond borders.</li>
      </ul>

      <h2>What this is not</h2>
      <ul>
        <li>Not a real estate service.</li>
        <li>Not a legal title, land deed, or property claim.</li>
        <li>Not affiliated with NASA, any national space agency, or any government.</li>
        <li>Not a mining, exclusion, or sovereignty right.</li>
      </ul>

      <h2>Our founding values</h2>
      <ul>
        <li><strong>Universal equality.</strong> Every human's certificate is equal in symbolic value.</li>
        <li><strong>Free access.</strong> Claiming a plot is, and will remain, free.</li>
        <li><strong>Education.</strong> Learn about the Moon, the Outer Space Treaty, and space law along the way.</li>
        <li><strong>Peaceful commemoration.</strong> The Moon belongs to all humanity — and to none of us alone.</li>
      </ul>

      <h2>The Outer Space Treaty</h2>
      <p>
        The 1967 Outer Space Treaty (formally the <em>Treaty on Principles Governing the Activities of States
        in the Exploration and Use of Outer Space</em>) declares that outer space, including the Moon and other
        celestial bodies, cannot be appropriated by claim of sovereignty, use, or occupation. It has been
        ratified by more than 110 nations.
      </p>
      <p>
        We support this treaty in spirit and in letter. Our registry is symbolic and educational — a gentle
        thought experiment about what a peaceful, inclusive lunar citizenship might look like, without ever
        challenging the shared, non-appropriable status of the Moon.
      </p>

      <h2>Imagery</h2>
      <p>
        We use publicly available NASA imagery (including the LROC mosaic) with credit where displayed.
        Use of NASA imagery does not imply NASA endorsement of, or affiliation with, this project.
      </p>

      <h2>Contact</h2>
      <p>
        For questions or media inquiries, please reach us via the project's public channels linked from the
        homepage.
      </p>
    </LegalPageShell>
  );
}
