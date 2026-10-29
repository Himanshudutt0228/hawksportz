import type { Metadata } from "next";
import { storeContactEmail } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: "Privacy | Hawk Sportz",
  description: "How the Hawk Sportz website uses account, order and email information, cookies and saved designs, and how to contact us about privacy.",
};

export default function PrivacyPage() {
  return <main className="mobile-content mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
    <h1 className="text-4xl font-semibold tracking-tight">Privacy notice</h1>
    <p className="mt-4 text-sm text-gray-500">Last updated: October 28, 2026</p>
    <p className="mt-5 leading-7 text-gray-600">This notice describes the current Hawk Sportz website. Checkout is currently in test mode. Information you enter during testing can still be stored and sent to our service providers.</p>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Information we use</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-gray-600">
        <li><strong>Accounts:</strong> your email address and authentication information are used to create an account, verify your email, sign you in and reset your password.</li>
        <li><strong>Orders:</strong> purchased items, sizes, quantities, prices, fulfilment choice and status are stored with your order. Checkout provides your name, email, billing details and, for delivery, shipping details. A phone number is stored if provided by the payment service.</li>
        <li><strong>Payments:</strong> Stripe hosts the payment form. We receive payment status, amounts and customer details needed for the order. Our order database does not store your full card number or security code.</li>
        <li><strong>Messages:</strong> if you email us, we receive your address, message and any attachments so we can respond to your request.</li>
        <li><strong>Connection information:</strong> service providers may process IP addresses, browser information and security logs to operate and protect their services.</li>
      </ul>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Why information is used</h2>
      <p className="mt-4 leading-7 text-gray-600">We use information to operate your account, process orders, manage delivery or pickup, send account and order messages, answer questions and protect access to the store. Authorized store administrators can view the customer and order details needed to manage orders.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Service providers</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-gray-600">
        <li><a href="https://supabase.com/privacy" className="underline">Supabase</a> provides account authentication and database storage.</li>
        <li><a href="https://stripe.com/privacy" className="underline">Stripe</a> processes checkout and payment information.</li>
        <li><a href="https://resend.com/legal/privacy-policy" className="underline">Resend</a> sends account and order emails, including the recipient address and message content. It also processes delivery information.</li>
        <li>Google Gmail receives and stores correspondence sent to our business contact inbox.</li>
      </ul>
      <p className="mt-4 leading-7 text-gray-600">Providers may process information outside Canada. Their processing locations and practices depend on the service and its configuration.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Cookies, your cart and saved artwork</h2>
      <p className="mt-4 leading-7 text-gray-600">Cookies support sign-in and private order access. The guest order-access cookie is set for up to 30 days. Your browser also saves your cart, payment cleanup markers and your most recently opened design.</p>
      <p className="mt-4 leading-7 text-gray-600">Design drafts, uploaded artwork and design snapshots are currently saved in the browser on your device, rather than uploaded as production artwork to our server. They are not automatically available on another browser or device.</p>
      <p className="mt-4 leading-7 text-gray-600">Clearing site data can remove your saved cart, artwork and guest receipt access. Export designs you want to keep before clearing storage. Blocking cookies or browser storage can prevent these features from working.</p>
      <p className="mt-4 leading-7 text-gray-600">We have not added advertising or audience analytics tools to this website. Service providers can have their own cookies and privacy practices.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Stored records and your choices</h2>
      <p className="mt-4 leading-7 text-gray-600">Signing out or clearing browser data does not delete account, order, email or correspondence records held by us or our providers. A fixed retention and deletion schedule for these server records has not yet been finalized for the live store.</p>
      <p className="mt-4 leading-7 text-gray-600">You can ask what personal information we hold, request access or corrections, or ask about account closure, deletion or withdrawing consent. We may need to verify your identity before acting on a request. Applicable legal requirements can affect which records can be removed.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Privacy questions and requests</h2>
      <p className="mt-4 leading-7 text-gray-600">Contact Hawk Sportz at <a href={`mailto:${storeContactEmail}?subject=Privacy%20request`} className="break-all underline">{storeContactEmail}</a> and mark your message “Privacy request.” Include enough information to explain your request. Do not send passwords or full payment-card details.</p>
    </section>
  </main>;
}
