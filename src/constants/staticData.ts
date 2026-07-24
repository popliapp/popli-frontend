// FAQ list — financial values (rate, minimum) are fetched at runtime from /system/public-configs
// and injected by the component that renders this list.
// Use the placeholders {VIEW_RATE} and {MIN_WITHDRAWAL} as substitution tokens.
export const FAQ_LIST_TEMPLATE = [
  {
    q: 'How does view monetization work?',
    a: 'Every creator earns ₹{VIEW_RATE} per 1,000 genuine views. There are no minimum 10K followers required. Start earning from your very first video!',
  },
  {
    q: 'What is the minimum withdrawal limit?',
    a: 'You can withdraw minimum ₹{MIN_WITHDRAWAL} directly to your linked UPI ID or bank account. All payouts are safe, secure, and processed within 24 hours.',
  },
  {
    q: 'How can I earn coins or receive gifts?',
    a: 'Fans can recharge virtual coins and buy gifts (Rose, Rocket, Crown, etc.) in the video player bottom panel. When they gift you, these coins are credited directly to your creator balance as cashable earnings.',
  },
  {
    q: 'How does hyperlocal feed selection work?',
    a: 'The "Nearby Feed" uses GPS coordinates to match you with creators within 0-50 km of your exact location, promoting local trends and talent!',
  },
  {
    q: 'Is my KYC details secure?',
    a: 'Yes, absolutely. We use industry-standard encryption protocols. Your PAN, Aadhaar, and bank coordinates are fully encrypted and never shared.',
  },
];

// Usage in your FAQ component:
//
//   const { viewRatePer1000, minWithdrawalInr } = useSystemConfig();
//   const faqList = FAQ_LIST_TEMPLATE.map(item => ({
//     ...item,
//     a: item.a
//       .replace('{VIEW_RATE}', String(viewRatePer1000))
//       .replace('{MIN_WITHDRAWAL}', String(minWithdrawalInr)),
//   }));
