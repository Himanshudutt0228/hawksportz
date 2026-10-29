export default function DesignApprovalNotice({ emailReady = false }: { emailReady?: boolean }) {
  return <p className="mt-3 text-sm leading-6 text-gray-600">The owner will review your design and may contact you if they have any questions.{emailReady && " You will receive an email once your design is approved."}</p>;
}
