import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

type VehicleValue = 'under5k' | '5k-15k' | '15k-30k' | 'over30k';
type AssetLevel = 'minimal' | 'moderate' | 'significant';
type LoanStatus = 'financed' | 'owned';

interface Recommendation {
  level: string;
  color: string;
  liability: string;
  collision: string;
  comprehensive: string;
  um: string;
  rationale: string[];
}

function getRecommendation(
  vehicleValue: VehicleValue,
  assetLevel: AssetLevel,
  loanStatus: LoanStatus,
  hasYoungDriver: boolean
): Recommendation {
  const financed = loanStatus === 'financed';
  const highAssets = assetLevel === 'significant';
  const lowVehicle = vehicleValue === 'under5k';

  const liability = highAssets ? '100/300/100' : assetLevel === 'moderate' ? '50/100/50' : '25/50/25';
  const needsFullCoverage = financed || vehicleValue === 'over30k' || vehicleValue === '15k-30k';
  const collision = needsFullCoverage || !lowVehicle ? 'Recommended' : 'Optional — consider dropping';
  const comprehensive = needsFullCoverage || !lowVehicle ? 'Recommended' : 'Optional — consider dropping';

  const rationale: string[] = [];

  if (financed) {
    rationale.push('Your lender requires collision and comprehensive coverage on a financed vehicle.');
  }
  if (highAssets) {
    rationale.push('Higher liability limits protect your assets if you cause a serious accident.');
  }
  if (lowVehicle && !financed) {
    rationale.push(
      'With a vehicle worth under $5,000, collision and comprehensive may cost more than they would pay out. Consider dropping them.'
    );
  }
  if (hasYoungDriver) {
    rationale.push(
      'Young drivers on the policy increase accident risk, making collision and comprehensive coverage more valuable.'
    );
  }
  if (vehicleValue === 'over30k') {
    rationale.push('A high-value vehicle warrants full coverage to protect against a significant financial loss.');
  }

  rationale.push('Uninsured motorist coverage is strongly recommended in Minnesota and Wisconsin, where roughly 1 in 8 drivers is uninsured.');

  return {
    level: highAssets || financed || vehicleValue === 'over30k' ? 'Full Coverage' : lowVehicle ? 'Liability-Focused' : 'Standard',
    color: highAssets || vehicleValue === 'over30k' ? 'green' : lowVehicle && !financed ? 'yellow' : 'blue',
    liability,
    collision,
    comprehensive,
    um: 'Strongly Recommended',
    rationale,
  };
}

const CoverageCalculatorPage: React.FC = () => {
  const [vehicleValue, setVehicleValue] = useState<VehicleValue | ''>('');
  const [assetLevel, setAssetLevel] = useState<AssetLevel | ''>('');
  const [loanStatus, setLoanStatus] = useState<LoanStatus | ''>('');
  const [hasYoungDriver, setHasYoungDriver] = useState<boolean | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);

  const canCalculate = vehicleValue && assetLevel && loanStatus && hasYoungDriver !== null;

  const handleCalculate = () => {
    if (!vehicleValue || !assetLevel || !loanStatus || hasYoungDriver === null) return;
    setResult(getRecommendation(vehicleValue, assetLevel, loanStatus, hasYoungDriver));
  };

  const handleReset = () => {
    setVehicleValue('');
    setAssetLevel('');
    setLoanStatus('');
    setHasYoungDriver(null);
    setResult(null);
  };

  const colorMap = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <h1 className="text-4xl font-bold text-[#1A3A63] mb-3">Coverage Calculator</h1>
          <p className="text-lg text-gray-600 mb-2">
            Answer four questions to get a general coverage recommendation for your situation.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            This tool provides general guidance only, not a binding quote. See our{' '}
            <Link to="/disclaimer" className="underline">Disclaimer</Link>.
          </p>

          {!result ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-7">

              {/* Q1 */}
              <div>
                <label className="block font-semibold text-[#1A3A63] mb-2">
                  1. What is your vehicle roughly worth?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['under5k', 'Under $5,000'],
                    ['5k-15k', '$5,000 – $15,000'],
                    ['15k-30k', '$15,000 – $30,000'],
                    ['over30k', 'Over $30,000'],
                  ] as [VehicleValue, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setVehicleValue(val)}
                      className={`px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                        vehicleValue === val
                          ? 'bg-[#1A3A63] text-white border-[#1A3A63]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#1A3A63]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2 */}
              <div>
                <label className="block font-semibold text-[#1A3A63] mb-2">
                  2. Is your vehicle financed or paid off?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['financed', 'Financed / Leased'],
                    ['owned', 'Paid Off'],
                  ] as [LoanStatus, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setLoanStatus(val)}
                      className={`px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                        loanStatus === val
                          ? 'bg-[#1A3A63] text-white border-[#1A3A63]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#1A3A63]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q3 */}
              <div>
                <label className="block font-semibold text-[#1A3A63] mb-1">
                  3. How would you describe your personal assets (savings, home equity, etc.)?
                </label>
                <p className="text-xs text-gray-400 mb-2">This helps determine appropriate liability limits.</p>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    ['minimal', 'Minimal — little savings or assets'],
                    ['moderate', 'Moderate — some savings, maybe a home'],
                    ['significant', 'Significant — substantial savings or assets to protect'],
                  ] as [AssetLevel, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setAssetLevel(val)}
                      className={`px-4 py-3 rounded-md border text-sm font-medium text-left transition-colors ${
                        assetLevel === val
                          ? 'bg-[#1A3A63] text-white border-[#1A3A63]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#1A3A63]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Q4 */}
              <div>
                <label className="block font-semibold text-[#1A3A63] mb-2">
                  4. Is there a driver under age 25 on your policy?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    [true, 'Yes'],
                    [false, 'No'],
                  ] as [boolean, string][]).map(([val, label]) => (
                    <button
                      key={String(val)}
                      onClick={() => setHasYoungDriver(val)}
                      className={`px-4 py-3 rounded-md border text-sm font-medium transition-colors ${
                        hasYoungDriver === val
                          ? 'bg-[#1A3A63] text-white border-[#1A3A63]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#1A3A63]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className={`w-full py-3 rounded-md font-semibold transition-colors ${
                  canCalculate
                    ? 'bg-[#F7B538] text-[#1A3A63] hover:bg-yellow-400'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Get My Recommendation
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className={`rounded-lg border p-6 ${colorMap[result.color as keyof typeof colorMap]}`}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-6 h-6 text-[#1A3A63]" />
                  <h2 className="text-xl font-bold text-[#1A3A63]">
                    Recommended Approach: {result.level}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Liability Limits</p>
                    <p className="font-semibold text-[#1A3A63]">{result.liability}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">UM / UIM Coverage</p>
                    <p className="font-semibold text-[#1A3A63]">{result.um}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Collision</p>
                    <p className="font-semibold text-[#1A3A63]">{result.collision}</p>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Comprehensive</p>
                    <p className="font-semibold text-[#1A3A63]">{result.comprehensive}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {result.rationale.map((point, i) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-700">
                      <AlertCircle size={15} className="text-[#1A3A63] flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-500 mb-4">
                  This estimate is based on general guidelines. A licensed agent can give you exact
                  pricing and help you find the right balance of coverage and cost.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/quote-form"
                    className="flex-1 text-center bg-[#1A3A63] text-white font-semibold py-3 rounded-md hover:bg-blue-900 transition-colors"
                  >
                    Get a Real Quote
                  </Link>
                  <button
                    onClick={handleReset}
                    className="flex-1 text-center border border-gray-300 text-gray-600 font-semibold py-3 rounded-md hover:border-gray-400 transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CoverageCalculatorPage;
