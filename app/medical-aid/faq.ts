// Sample questions and answers for the Care Plans page. Wording is placeholder
// copy: replace it with the clinic's confirmed terms before going live.

export type Faq = { question: string; answer: string };

export const faqs: Faq[] = [
  {
    question: 'What is a Family Clinic Care Plan?',
    answer:
      'A monthly membership with the clinic. It gives you discounted consultations, pharmacy savings and extras such as immunisation visits, depending on the plan you choose. You manage everything online, in one place.',
  },
  {
    question: 'Is a Care Plan the same as a registered medical scheme?',
    answer:
      'No. Care Plans are clinic memberships that reduce what you pay at this clinic. They are not hospital cover or a substitute for a registered medical scheme. If you already belong to a scheme such as Discovery, Momentum or Bonitas, you can keep it and add your scheme details under Medical aid in your patient portal.',
  },
  {
    question: 'How do I sign up?',
    answer:
      'Create a user account (or sign in if you already have a patient account), pick a plan, choose one of your saved cards and confirm. Your plan then appears in your patient portal straight away.',
  },
  {
    question: 'Which card is my plan paid from, and can I change it?',
    answer:
      'You save one or more credit cards online and choose which one your plan is debited from when you join. You can switch to a different saved card at any time from your Care Plans dashboard.',
  },
  {
    question: 'Is it safe to save my card?',
    answer:
      'We keep only the card type, the last four digits and the expiry date so you can recognise it. The full card number and the security code (CVV) are never stored.',
  },
  {
    question: 'Who is covered on the Family Plus plan?',
    answer:
      'Family Plus covers up to 2 adults and 4 children in the same household. Essential covers one person, and Premium includes everything in Family Plus plus extras.',
  },
  {
    question: 'What do I see once I have paid for a plan?',
    answer:
      'Your patient portal shows your plan, its status, when the next payment is due, the card it is paid from, your payment history and your plan documents, such as your membership certificate and benefit guide.',
  },
  {
    question: 'Can I cancel?',
    answer:
      'Yes. There is no long contract. You can cancel at any time from your Care Plans dashboard, and your payment history stays available to you.',
  },
];
