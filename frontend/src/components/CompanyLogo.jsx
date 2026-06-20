import React from 'react';

const LOGO_MAP = {
  amazon: 'https://www.svgrepo.com/show/303113/amazon-2-logo.svg',
  google: 'https://www.svgrepo.com/show/475647/google-color.svg',
  microsoft: 'https://www.svgrepo.com/show/448243/microsoft.svg',
  servicenow: 'https://www.svgrepo.com/show/354332/servicenow.svg',
  salesforce: 'https://www.svgrepo.com/show/452097/salesforce.svg',
  adobe: 'https://www.svgrepo.com/show/452148/adobe.svg',
  'goldman sachs': 'https://www.svgrepo.com/show/353818/goldman-sachs.svg',
  'jp morgan': 'https://www.svgrepo.com/show/353924/jpmorgan.svg',
  'jp morgan chase': 'https://www.svgrepo.com/show/353924/jpmorgan.svg',
  deloitte: 'https://www.svgrepo.com/show/353655/deloitte.svg',
  accenture: 'https://www.svgrepo.com/show/353346/accenture.svg',
  tcs: 'https://www.svgrepo.com/show/330206/tata-consultancy-services.svg',
  infosys: 'https://www.svgrepo.com/show/342000/infosys.svg',
  wipro: 'https://www.svgrepo.com/show/306981/wipro.svg',
  cognizant: 'https://www.svgrepo.com/show/341738/cognizant.svg',
  capgemini: 'https://www.svgrepo.com/show/353526/capgemini.svg',
  nvidia: 'https://www.svgrepo.com/show/354124/nvidia.svg',
  oracle: 'https://www.svgrepo.com/show/448244/oracle.svg',
  cisco: 'https://www.svgrepo.com/show/353574/cisco.svg',
  walmart: 'https://www.svgrepo.com/show/354526/walmart.svg',
  'walmart global tech': 'https://www.svgrepo.com/show/354526/walmart.svg',
};

export default function CompanyLogo({ name, className = "w-8 h-8" }) {
  const normalized = (name || '').toLowerCase().trim();
  
  // Find key that normalized contains
  const matchingKey = Object.keys(LOGO_MAP).find(key => normalized.includes(key));
  const matchedUrl = matchingKey ? LOGO_MAP[matchingKey] : null;

  if (matchedUrl) {
    return (
      <img
        src={matchedUrl}
        alt={name}
        className={`${className} object-contain rounded bg-white p-0.5`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = 'none';
        }}
      />
    );
  }

  const initials = normalized ? normalized.charAt(0).toUpperCase() : '?';
  const colors = [
    'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
    'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500',
    'bg-emerald-500', 'bg-green-500', 'bg-orange-500', 'bg-amber-500'
  ];
  const charCode = normalized ? normalized.charCodeAt(0) : 0;
  const colorClass = colors[charCode % colors.length];

  return (
    <div className={`${className} flex items-center justify-center rounded text-white font-bold text-xs select-none ${colorClass}`}>
      {initials}
    </div>
  );
}
