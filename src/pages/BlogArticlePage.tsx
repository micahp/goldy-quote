import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { getArticleById, getArticlesByCategory } from '../data/mockArticles';

type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; text: string };

const articleBodyById: Record<string, ArticleBlock[]> = {
  'article-1': [
    {
      type: 'paragraph',
      text: "If you've ever stared at a car insurance quote trying to figure out what you're actually paying for, you're not alone. Auto insurance policies are written in language that feels designed to confuse, but underneath all the jargon is a set of straightforward concepts. Once you understand what each coverage type does, you can make smarter decisions about what to buy, and what you might be paying for unnecessarily."
    },
    {
      type: 'heading',
      text: 'The Foundation: Liability Coverage'
    },
    {
      type: 'paragraph',
      text: 'Liability insurance is the one coverage type required by law in nearly every U.S. state. It pays for damage you cause to other people and their property when you are at fault in an accident. There are two components:'
    },
    {
      type: 'list',
      items: [
        'Bodily injury liability (BI): Covers medical bills, lost wages, and pain-and-suffering claims for people you injure in an accident you caused.',
        'Property damage liability (PD): Pays to repair or replace the other driver\'s car, a fence, a storefront, or anything else you damage with your vehicle.'
      ]
    },
    {
      type: 'paragraph',
      text: "You'll often see liability limits written as three numbers, like 25/50/25. That means $25,000 per injured person, $50,000 per accident for all injuries combined, and $25,000 for property damage. State minimums are just that: minimums. If you cause a serious accident and your limits are too low, you pay the difference out of pocket. Most financial advisors recommend at least 100/300/100 if you have assets worth protecting."
    },
    {
      type: 'callout',
      text: 'Rule of thumb: Your liability limits should be at least as high as your net worth. If you own a home or have significant savings, bare-minimum coverage is a real financial risk.'
    },
    {
      type: 'heading',
      text: 'Collision Coverage'
    },
    {
      type: 'paragraph',
      text: "Collision coverage pays to repair your own vehicle after it's damaged in an accident, whether you hit another car, a guardrail, or a pothole that launches you into a ditch. The key word is collision: your car physically striking something (or something striking your parked car)."
    },
    {
      type: 'paragraph',
      text: "This coverage comes with a deductible, which is the amount you pay before your insurance kicks in. Common deductibles range from $250 to $1,500. The higher the deductible you choose, the lower your premium. But if you raise your deductible to $1,500 and your car is only worth $4,000, you're gambling that a repair bill will land in that narrow window where it's worth filing a claim at all."
    },
    {
      type: 'heading',
      text: 'Comprehensive Coverage'
    },
    {
      type: 'paragraph',
      text: 'Despite the name, comprehensive doesn\'t cover everything. It covers damage to your car from causes that aren\'t a collision: theft, vandalism, fire, flooding, hail, falling trees, and wildlife strikes. If a deer walks into your car on a country road, that\'s a comprehensive claim, not a collision claim.'
    },
    {
      type: 'paragraph',
      text: 'Collision and comprehensive are almost always sold together and are collectively what people mean when they say "full coverage." If your car is financed or leased, your lender will require both.'
    },
    {
      type: 'heading',
      text: 'Uninsured and Underinsured Motorist Coverage'
    },
    {
      type: 'paragraph',
      text: "Here's a sobering statistic: roughly 1 in 8 drivers on U.S. roads carries no insurance at all. Uninsured motorist coverage (UM) protects you when one of those drivers hits you and can't pay. Underinsured motorist coverage (UIM) kicks in when the at-fault driver has insurance, but their limits aren't enough to cover your damages."
    },
    {
      type: 'paragraph',
      text: "UM/UIM coverage is surprisingly affordable and, in our view, one of the most undervalued options on any auto policy. In many states you can get it for just a few dollars more per month. Without it, your only recourse against an uninsured driver is a lawsuit, which is expensive, slow, and often fruitless."
    },
    {
      type: 'heading',
      text: 'Medical Payments and Personal Injury Protection'
    },
    {
      type: 'paragraph',
      text: 'Medical payments coverage (MedPay) pays for medical expenses for you and your passengers after an accident, regardless of who was at fault. Personal injury protection (PIP) is similar but broader: it can also cover lost wages and rehabilitation costs. PIP is required in "no-fault" states, meaning each driver\'s own insurance handles their injuries regardless of who caused the crash.'
    },
    {
      type: 'list',
      items: [
        'MedPay: Covers medical bills only. Available in most states. Usually in small amounts ($1,000–$10,000).',
        'PIP: Covers medical bills, lost income, and sometimes childcare or household services. Required in no-fault states like Florida, Michigan, and New York.'
      ]
    },
    {
      type: 'heading',
      text: 'Putting It All Together'
    },
    {
      type: 'paragraph',
      text: "The right combination of coverages depends on your car's value, your financial situation, and your state's requirements. A good starting framework: always carry more liability than your state's minimum, add UM/UIM unless you have strong health insurance, and only skip collision/comprehensive once your car's value drops low enough that the premiums outweigh the potential payout."
    },
    {
      type: 'callout',
      text: 'Quick check: Divide your annual collision + comprehensive premium by 10. If your car is worth less than that number times 10, you may be overpaying for those coverages. (Example: $800/year in premiums on a $5,000 car means you\'re paying 16% of the car\'s value annually, and that math gets uncomfortable fast.)'
    }
  ],

  'article-2': [
    {
      type: 'paragraph',
      text: "Car insurance is one of those expenses that's easy to set and forget: you sign up, auto-pay kicks in, and you don't think about it again until the renewal notice arrives. But rates change, life changes, and the policy you bought three years ago may not be the best deal available today. The good news: there are a dozen legitimate ways to lower your premium without gutting your coverage."
    },
    {
      type: 'heading',
      text: '1. Shop Around Every Single Year'
    },
    {
      type: 'paragraph',
      text: "Loyalty to your current insurer almost never pays off financially. Insurance companies compete aggressively for new customers, which means new-customer rates are often lower than what existing policyholders are quietly paying. Studies consistently show that people who compare quotes annually save hundreds of dollars on average. The process takes about 15 minutes online and costs nothing."
    },
    {
      type: 'paragraph',
      text: "Use a comparison site or get quotes directly from at least three carriers. Make sure you're comparing the same coverage limits and deductibles across each quote, or you're not really comparing apples to apples."
    },
    {
      type: 'heading',
      text: '2. Bundle Your Policies'
    },
    {
      type: 'paragraph',
      text: "Most major insurers offer a multi-policy discount, typically 5% to 25%, when you combine auto and homeowners (or renters) insurance with the same company. This is one of the most painless ways to save because you're not reducing coverage, you're just consolidating. Ask your current insurer what the bundling rate would be, then compare that bundled price against shopping both policies separately."
    },
    {
      type: 'heading',
      text: '3. Raise Your Deductible'
    },
    {
      type: 'paragraph',
      text: 'Your deductible is the amount you pay out of pocket before insurance covers a claim. Raising your collision deductible from $500 to $1,000 can reduce that portion of your premium by 10% to 40%, depending on the insurer and your driving history. The trade-off is that you need to be able to cover that higher deductible if you do file a claim.'
    },
    {
      type: 'callout',
      text: 'Before raising your deductible, make sure you have that amount sitting comfortably in savings. A $1,500 deductible is only a smart move if you actually have $1,500 you can access quickly after an accident.'
    },
    {
      type: 'heading',
      text: '4. Ask About Every Discount Available'
    },
    {
      type: 'paragraph',
      text: 'Insurers offer more discounts than most people realize, and they rarely volunteer the full list unprompted. Ask specifically about:'
    },
    {
      type: 'list',
      items: [
        'Good driver discount: Usually requires 3–5 years of clean driving history.',
        'Good student discount: Full-time students under 25 with a B average or better often qualify.',
        'Defensive driving course: Completing an approved course can knock 5–10% off your premium.',
        'Low mileage discount: If you drive fewer than 7,500–10,000 miles per year, some insurers offer a discount.',
        'Affinity discounts: Alumni associations, employers, and professional organizations often have negotiated rates.',
        'Paperless and autopay discounts: Small but effortless: just switching to electronic statements can save $5-$10 per policy period.',
        'Paid-in-full discount: Paying your full 6-month or annual premium upfront instead of monthly avoids installment fees.'
      ]
    },
    {
      type: 'heading',
      text: '5. Try a Telematics Program'
    },
    {
      type: 'paragraph',
      text: "Many insurers now offer usage-based or telematics programs (Progressive's Snapshot, State Farm's Drive Safe & Save, Allstate's Drivewise, etc.). You download an app or plug a device into your car, and the insurer monitors your actual driving habits, including speed, braking, time of day, and mileage. Safe drivers can earn meaningful discounts, sometimes 20–40%."
    },
    {
      type: 'paragraph',
      text: "The trade-off is data privacy. You are, quite literally, letting the insurer watch how you drive. If you're a careful driver, this is mostly upside. If you have a lead foot or drive late at night regularly, it could work against you. Most programs only reward good behavior rather than penalizing bad, but read the fine print."
    },
    {
      type: 'heading',
      text: '6. Improve Your Credit Score'
    },
    {
      type: 'paragraph',
      text: "In most states (not California, Hawaii, or Massachusetts), insurers use a credit-based insurance score to help set your rate. It's not identical to your FICO score but is heavily influenced by the same factors: payment history, utilization, length of credit history, and recent inquiries. Drivers with poor credit can pay two to three times more than drivers with excellent credit for identical coverage."
    },
    {
      type: 'paragraph',
      text: "Improving credit takes time, but even modest improvements can shift you into a lower rate tier at renewal. Pay bills on time, reduce credit card balances, and avoid opening new accounts unnecessarily."
    },
    {
      type: 'heading',
      text: '7. Reconsider Coverage on Older Vehicles'
    },
    {
      type: 'paragraph',
      text: "Once a car is old enough and its market value drops low enough, carrying collision and comprehensive coverage may no longer make financial sense. If your car is worth $3,500 and your combined collision and comprehensive premium is $900 a year with a $500 deductible, you'd pocket a maximum payout of $3,000, and only if the car were totaled. Dropping those coverages on a paid-off older car is a legitimate way to cut costs."
    },
    {
      type: 'callout',
      text: "Use Kelley Blue Book or Edmunds to check your car's current market value. If the value is less than 10 times your annual collision + comp premium, strongly consider dropping those coverages."
    },
    {
      type: 'heading',
      text: 'The Bottom Line'
    },
    {
      type: 'paragraph',
      text: "You don't have to sacrifice protection to lower your bill. In most cases, a combination of shopping around, stacking available discounts, and making one or two strategic coverage adjustments can reduce your premium by 15–30% without meaningfully increasing your risk. Treat your car insurance renewal as an annual financial review, not an automatic approval."
    }
  ],

  'article-3': [
    {
      type: 'paragraph',
      text: "Ever wonder why your neighbor pays half what you do for car insurance, even though you both have clean records and similar cars? Insurance pricing is not arbitrary: it's built on actuarial data, probability models, and sometimes factors that seem entirely unrelated to driving. Understanding what goes into the calculation puts you in a better position to manage your costs over time."
    },
    {
      type: 'heading',
      text: 'Your Driving Record'
    },
    {
      type: 'paragraph',
      text: "This is the most direct factor. At-fault accidents, speeding tickets, DUIs, and other violations signal elevated risk to insurers. A single at-fault accident can raise your premium by 30–50% at renewal. DUIs can double or even triple your rate and stay on your record for 5–10 years depending on the state."
    },
    {
      type: 'paragraph',
      text: "The silver lining: most violations age off your insurance record after 3 to 5 years, and your rate will typically improve at each renewal once they do. Keeping your record clean is the single most powerful thing you can do to maintain low premiums."
    },
    {
      type: 'heading',
      text: 'Where You Live'
    },
    {
      type: 'paragraph',
      text: "Your ZIP code matters more than most people realize. Insurers track claim frequency, theft rates, accident density, weather patterns, and repair costs down to the local level. Drivers in dense urban areas typically pay more than those in rural areas because the probability of an accident or a theft is statistically higher."
    },
    {
      type: 'list',
      items: [
        'Urban areas: Higher traffic density = more accidents. Higher crime rates = more theft and vandalism claims.',
        'Coastal and storm-prone regions: More comprehensive claims from hail, flooding, and hurricane damage.',
        'States with no-fault laws: States like Florida and Michigan have higher average premiums partly because PIP coverage is mandatory and claims are more frequent.',
        'Rural areas: Lower traffic and crime, but longer distances to repair shops can increase costs.'
      ]
    },
    {
      type: 'callout',
      text: 'Moving even a few miles, say from a city center to a suburb, can result in a lower premium at your next renewal. Always update your garaging address promptly when you move. Misrepresenting your address, even by mistake, can give an insurer grounds to deny a claim.'
    },
    {
      type: 'heading',
      text: 'Your Age and Experience'
    },
    {
      type: 'paragraph',
      text: "Teenagers and young adults are statistically the riskiest drivers on the road. Drivers ages 16–25 have accident rates far above the national average, so insurers price accordingly. Rates typically peak in the late teens and begin falling through the mid-20s as driving history accumulates."
    },
    {
      type: 'paragraph',
      text: "Interestingly, rates can tick back up slightly for drivers in their late 70s and 80s, as reaction time, vision, and other factors begin to affect accident frequency. The sweet spot for premium savings is typically ages 35–65 with a clean record."
    },
    {
      type: 'heading',
      text: 'Your Vehicle'
    },
    {
      type: 'paragraph',
      text: "The car you drive affects your rate in several ways. Insurers look at:"
    },
    {
      type: 'list',
      items: [
        'Repair costs: Luxury vehicles, EVs, and certain imports can cost significantly more to repair after a collision.',
        'Safety ratings: Cars with high safety ratings and advanced safety features may qualify for discounts.',
        'Theft rates: Some models are stolen far more often than others. The Honda Civic, Hyundai Sonata, and certain pickup trucks have historically ranked among the most stolen, which raises comprehensive premiums.',
        'Horsepower: High-performance vehicles with large engines are assumed to be driven faster and more aggressively, resulting in higher collision rates.'
      ]
    },
    {
      type: 'paragraph',
      text: "Before you buy a car, it's worth getting an insurance quote on the specific model. Two vehicles at the same purchase price can have premiums that differ by $500 or more per year."
    },
    {
      type: 'heading',
      text: 'Your Credit History'
    },
    {
      type: 'paragraph',
      text: "In most states, insurers use a credit-based insurance score (not your standard FICO score, but a scoring model derived from similar data) to predict the likelihood that you'll file a claim. Extensive research has shown a statistical correlation between credit factors and claim frequency, which is why most states permit its use."
    },
    {
      type: 'paragraph',
      text: "Drivers with poor credit can pay two to three times more than those with excellent credit for the same coverage. It's one of the most significant and least understood rate factors. California, Hawaii, Massachusetts, and Michigan prohibit the use of credit in auto insurance pricing."
    },
    {
      type: 'heading',
      text: 'How Much You Drive'
    },
    {
      type: 'paragraph',
      text: "Simply put: more miles driven = more exposure to risk. Insurers ask for your estimated annual mileage, and some use telematics devices to verify it. If you work from home and barely use your car, make sure you're reporting that accurately. Drivers who log fewer than 7,500 miles per year often qualify for low-mileage discounts."
    },
    {
      type: 'heading',
      text: 'The Coverage You Choose'
    },
    {
      type: 'paragraph',
      text: "Finally, your own coverage decisions directly control a portion of your premium. The limits you select, the deductibles you choose, and the optional coverages you add all affect price. Higher liability limits, lower deductibles, and add-ons like rental reimbursement and roadside assistance all increase your premium, but they also increase your protection."
    },
    {
      type: 'callout',
      text: 'The best approach: understand every line item on your quote and know what it covers. You should never be surprised by a coverage gap when you actually need to file a claim.'
    }
  ],

  'article-4': [
    {
      type: 'paragraph',
      text: "Getting your license is one of the most liberating milestones in a young person's life. Getting your first car insurance policy is... considerably less exciting. Rates for new drivers are high, often frustratingly so, and the options can feel overwhelming. But the decisions you make early on have lasting consequences, and understanding the landscape helps you avoid the most common and costly mistakes."
    },
    {
      type: 'heading',
      text: 'Why New Drivers Pay More'
    },
    {
      type: 'paragraph',
      text: "Insurance pricing is based on statistical risk. Drivers with no track record present the most uncertainty, and drivers aged 16–25 have the highest accident rates of any demographic group by a wide margin. The National Highway Traffic Safety Administration consistently finds that teens are involved in crashes at rates three to four times higher than drivers ages 35–64."
    },
    {
      type: 'paragraph',
      text: "This isn't a judgment of your individual skill. It's actuarial math. Insurers can't know yet whether you're a careful driver, so they price based on the group average. The good news: every clean year you accumulate works in your favor, and rates generally drop meaningfully through your mid-20s."
    },
    {
      type: 'heading',
      text: 'Should You Stay on a Parent\'s Policy?'
    },
    {
      type: 'paragraph',
      text: "For most new drivers under 25, staying on a parent's policy is significantly cheaper than getting your own. Adding a teen to an existing policy typically costs $150–$300 more per month, which sounds like a lot, until you price out a standalone policy for a 17-year-old with no history, which can easily run $400–$600+ per month on its own."
    },
    {
      type: 'paragraph',
      text: "The main condition is that you live at the same address and share the vehicles. Once you move out and have your own car, you'll generally need your own policy, and at that point you'll hopefully have a few years of clean history that helps lower the rate."
    },
    {
      type: 'callout',
      text: 'Important: You must be listed on the policy for any vehicle you drive regularly. "Occasionally borrowing" a parent\'s car when you actually drive it daily is a misrepresentation that can lead to claim denial.'
    },
    {
      type: 'heading',
      text: 'Discounts Worth Chasing'
    },
    {
      type: 'paragraph',
      text: "There are several discounts specifically available to young drivers that can meaningfully offset the high base rate:"
    },
    {
      type: 'list',
      items: [
        'Good student discount: Most major insurers offer 5–25% off for students under 25 who maintain a B average (3.0 GPA) or better. Keep proof of your grades handy at each renewal.',
        'Defensive driving course: Completing a state-approved safe driving course (many are available online for $30-$70) typically earns a 5-15% discount and might also satisfy certain court or parental requirements.',
        'Student away at school discount: If you attend college more than 100 miles from home and leave the car behind, many insurers offer a significant rate reduction since the vehicle isn\'t being driven daily.',
        'Telematics / usage-based programs: Apps like State Farm\'s Drive Safe & Save or Progressive\'s Snapshot monitor your driving and reward careful habits. Safe young drivers can earn substantial discounts, sometimes more than any other single discount available.'
      ]
    },
    {
      type: 'heading',
      text: 'Choose Your First Car Wisely'
    },
    {
      type: 'paragraph',
      text: "The car you drive dramatically affects your insurance rate. A flashy sports car or a powerful SUV with a large engine might be exciting, but insurance companies see them as higher-risk vehicles and price accordingly. For a new driver trying to keep costs manageable, the ideal first car is:"
    },
    {
      type: 'list',
      items: [
        'A few years old (depreciation has happened, but it\'s reliable)',
        'A non-performance model, such as a Honda Civic rather than a Civic Si',
        'Rated highly for safety by the IIHS or NHTSA',
        'Not on the most-stolen vehicles list',
        'Paid off, so you\'re not forced into full coverage if cost is a concern'
      ]
    },
    {
      type: 'paragraph',
      text: "Before buying any used car, get an insurance quote on the specific make, model, trim, and year. This takes five minutes online and could save you hundreds per year."
    },
    {
      type: 'heading',
      text: 'Understanding State Requirements'
    },
    {
      type: 'paragraph',
      text: "Every state sets a minimum amount of liability coverage drivers must carry. These minimums vary widely. Some states require only $15,000 per person in bodily injury coverage, an amount that could be exhausted in a moderate accident at any decent hospital. Minimum coverage satisfies the law, but it doesn't necessarily protect you financially."
    },
    {
      type: 'paragraph',
      text: "For new drivers who don't yet have significant assets to protect, minimum or slightly above-minimum liability coverage paired with a higher deductible on collision and comprehensive is a reasonable balance between cost and protection. As income and assets grow, it's worth revisiting and increasing limits."
    },
    {
      type: 'heading',
      text: 'Building Your Record'
    },
    {
      type: 'paragraph',
      text: "The single most powerful thing you can do to lower your rates is build a long, clean driving record. Each year without an accident or violation works in your favor. Insurers typically look at the past three to five years of driving history. One minor ticket doesn't define you forever, but accumulating multiple violations compounds the problem and can lead to a policy nonrenewal."
    },
    {
      type: 'callout',
      text: 'Perspective check: The higher rates you pay as a new driver are temporary. Rates for careful drivers typically fall 40–60% between ages 18 and 30. The habits you build now, both behind the wheel and with your insurance choices, shape that trajectory.'
    }
  ],

  'article-5': [
    {
      type: 'paragraph',
      text: "\"Full coverage or liability only?\" is one of the most common questions people face when shopping for car insurance, and one of the most misunderstood. The right answer depends on factors specific to your vehicle and financial situation. Let's cut through the confusion."
    },
    {
      type: 'heading',
      text: 'What "Liability Only" Actually Means'
    },
    {
      type: 'paragraph',
      text: "Liability-only insurance covers damage you cause to others: their injuries and their property. It does not pay to repair or replace your own vehicle after an accident, regardless of fault. If you rear-end someone at a stoplight with liability-only coverage, the other driver's car gets fixed. Yours does not."
    },
    {
      type: 'paragraph',
      text: "Liability-only is the legal minimum in most states. It is also, not coincidentally, the cheapest option. For many drivers with older, paid-off vehicles, it's a perfectly rational choice."
    },
    {
      type: 'heading',
      text: 'What "Full Coverage" Actually Means'
    },
    {
      type: 'paragraph',
      text: 'Despite how it sounds, "full coverage" is not an industry term; it\'s shorthand that most people use to mean liability plus collision plus comprehensive. It doesn\'t mean everything is covered in every scenario. There are still deductibles, coverage limits, and excluded situations.'
    },
    {
      type: 'list',
      items: [
        'Liability: Covers damage to others (required by law).',
        'Collision: Covers damage to your car from accidents, regardless of fault.',
        'Comprehensive: Covers damage to your car from non-collision events like theft, hail, flooding, fire, and animal strikes.'
      ]
    },
    {
      type: 'paragraph',
      text: "Full coverage gives you significantly more protection but costs more. The premium difference can range from a few hundred to over a thousand dollars per year, depending on your car, location, and driving history."
    },
    {
      type: 'heading',
      text: 'When Liability-Only Makes Sense'
    },
    {
      type: 'paragraph',
      text: "The core logic for dropping collision and comprehensive: if the annual cost of those coverages approaches or exceeds what you'd realistically collect from a claim, you're not getting good value."
    },
    {
      type: 'callout',
      text: 'The 10% rule: If your annual collision + comprehensive premium exceeds 10% of your car\'s current market value, it\'s worth seriously considering dropping those coverages. Example: a $2,000 car with $600/year in collision + comp premium means you\'re paying 30% of the car\'s value annually to protect it.'
    },
    {
      type: 'paragraph',
      text: "Liability-only tends to make sense when:"
    },
    {
      type: 'list',
      items: [
        'Your car is paid off and worth less than $5,000–$6,000',
        'You could afford to repair or replace the car out of pocket if needed',
        'You live in a low-risk area with few theft or weather incidents',
        'Your collision and comprehensive premium is high relative to the car\'s value'
      ]
    },
    {
      type: 'heading',
      text: 'When Full Coverage Makes Sense'
    },
    {
      type: 'paragraph',
      text: "Full coverage is often the smarter financial choice when:"
    },
    {
      type: 'list',
      items: [
        'Your car is financed or leased: virtually all lenders require it. Skip it and you\'re violating your loan agreement.',
        'Your car is relatively new or high in value, and a total loss would be a significant financial hit.',
        'You couldn\'t easily absorb a $10,000–$20,000 repair or replacement cost out of pocket.',
        'You live in an area with high theft rates, frequent severe weather, or dense traffic.',
        'You commute long distances and are exposed to more accident risk daily.'
      ]
    },
    {
      type: 'heading',
      text: 'The Deductible Variable'
    },
    {
      type: 'paragraph',
      text: "If you want full coverage but are trying to manage cost, your deductible is the main lever. A $1,500 deductible on collision and comprehensive can cost significantly less than a $250 deductible, and if you're a careful driver who rarely files claims, you may never reach that deductible."
    },
    {
      type: 'paragraph',
      text: "The key is to set a deductible you can actually afford to pay. There's no point in having a $1,500 deductible if an unexpected $1,500 expense would derail your finances. Make sure that amount sits in an accessible emergency fund before you commit to it."
    },
    {
      type: 'heading',
      text: 'One More Thing: Gap Insurance'
    },
    {
      type: 'paragraph',
      text: "If you financed a new car recently, there's a real possibility that you owe more on the loan than the car is currently worth, especially in the first 1-3 years of ownership. This is called being \"underwater\" or \"upside-down\" on the loan."
    },
    {
      type: 'paragraph',
      text: "If that car is totaled, your insurer pays the current market value, not the loan balance. Gap insurance covers the difference between those two numbers. It's relatively inexpensive (often $20–$40 per year added to your policy or a flat fee from the dealer) and can save you thousands if your car is totaled early in a loan term."
    },
    {
      type: 'callout',
      text: "Bottom line: Full coverage isn't always worth it, and liability-only isn't always reckless. The right answer comes down to your car's value, your financial cushion, and whether someone else (your lender) has a say in the matter."
    }
  ],

  'article-6': [
    {
      type: 'paragraph',
      text: "Accidents happen fast. One moment you're driving normally, and the next you're dealing with a crumpled bumper, an adrenaline rush, and no idea what to do first. What you do in the minutes, hours, and days after a crash can directly affect your safety, your insurance claim, and your legal standing. Here's a clear-headed walkthrough of what to do and what to avoid."
    },
    {
      type: 'heading',
      text: 'Step 1: Prioritize Safety First'
    },
    {
      type: 'paragraph',
      text: "If the accident is minor and vehicles are drivable, move them to the shoulder or a nearby parking lot to get out of traffic. If anyone is injured or the vehicles can't move safely, stay put, turn on your hazard lights, and set up flares or emergency triangles if you have them."
    },
    {
      type: 'paragraph',
      text: "Check yourself and your passengers for injuries. Adrenaline can mask pain; some injuries don't become obvious until hours later. Even if you feel fine, monitor yourself carefully in the hours that follow."
    },
    {
      type: 'heading',
      text: 'Step 2: Call the Police'
    },
    {
      type: 'paragraph',
      text: "In many states, you're legally required to report accidents above a certain damage threshold (often $1,000–$2,500). Even when it's not required, a police report is one of the most useful things you can have when it comes time to file a claim or dispute fault."
    },
    {
      type: 'paragraph',
      text: "When officers arrive, give them an accurate account of what happened: stick to what you observed, not what you think caused it. Ask for the report number before you leave; you'll need it."
    },
    {
      type: 'callout',
      text: "Even in minor fender-benders, consider calling police or filing a self-report at your local station. What looks like a $300 scratch can become a $3,000 claim once the other party involves a lawyer days later."
    },
    {
      type: 'heading',
      text: 'Step 3: Document Everything at the Scene'
    },
    {
      type: 'paragraph',
      text: "Your smartphone is the most powerful tool you have after an accident. Use it thoroughly:"
    },
    {
      type: 'list',
      items: [
        'Photograph both vehicles from multiple angles, including close-ups of damage and wide shots showing the scene.',
        'Photo the other driver\'s license, license plate, insurance card, and vehicle registration.',
        'Get photos of any skid marks, road conditions, traffic signs, or signals that are relevant.',
        'Note the exact location, time, and weather conditions.',
        'If there are witnesses, ask for their name and phone number.'
      ]
    },
    {
      type: 'paragraph',
      text: "This documentation is your evidence. The more thorough you are in the first 30 minutes, the better protected you are if the other party's story changes later."
    },
    {
      type: 'heading',
      text: 'Step 4: Exchange Information Carefully'
    },
    {
      type: 'paragraph',
      text: "Get the following from every other driver involved:"
    },
    {
      type: 'list',
      items: [
        'Full name and contact information',
        'Driver\'s license number and state',
        'Insurance company name and policy number',
        'Vehicle make, model, year, and license plate'
      ]
    },
    {
      type: 'paragraph',
      text: "Provide the same in return. You are required by law to exchange insurance information after an accident in every U.S. state."
    },
    {
      type: 'heading',
      text: 'Step 5: Do Not Admit Fault'
    },
    {
      type: 'paragraph',
      text: "This is critical. Even if you believe you caused the accident, do not say so at the scene. Do not say \"I'm sorry,\" \"this was my fault,\" or anything that can be interpreted as an admission. Fault is a legal and insurance determination made after all the facts are examined, not a declaration you should make under stress at the roadside."
    },
    {
      type: 'paragraph',
      text: "You can be empathetic and cooperative without accepting blame. \"Are you okay?\" is very different from \"I'm so sorry, I wasn't paying attention.\""
    },
    {
      type: 'heading',
      text: 'Step 6: Notify Your Insurer Promptly'
    },
    {
      type: 'paragraph',
      text: "Contact your insurance company as soon as reasonably possible, ideally the same day. Most policies have a reporting requirement, and delaying notification can create complications with your claim. You don't need to have all the answers; just report that the accident occurred."
    },
    {
      type: 'paragraph',
      text: "Your insurer will open a claim, assign an adjuster, and guide you through the next steps. The adjuster's job is to investigate the accident, determine fault (or apportion it), and calculate the value of the damages."
    },
    {
      type: 'callout',
      text: "You can file a claim with your own insurer or, if the other driver was clearly at fault, file directly with their insurer. Filing with your own insurer is usually faster and simpler; your insurer then pursues reimbursement from the at-fault party's carrier through a process called subrogation."
    },
    {
      type: 'heading',
      text: 'Step 7: Working Through the Claim'
    },
    {
      type: 'paragraph',
      text: "Once the claim is open, an adjuster will likely want to inspect the vehicle. You can take it to a repair shop for an estimate, but the insurer may also have preferred shops or a direct repair program. You're generally not required to use their preferred shop, but using one can sometimes speed up the process."
    },
    {
      type: 'paragraph',
      text: "If your car is totaled, meaning the repair cost exceeds its market value, the insurer will offer you an actual cash value (ACV) settlement. This is based on the car's pre-accident market value, accounting for age, mileage, and condition. You can negotiate this number if you believe it's too low; bring comparable vehicle listings as evidence."
    },
    {
      type: 'heading',
      text: 'Step 8: Know Your Rights'
    },
    {
      type: 'list',
      items: [
        'You have the right to get your own repair estimates, not just the insurer\'s.',
        'You can dispute a settlement offer if you believe it\'s inadequate; provide documentation.',
        'If you\'re injured, consult a personal injury attorney before settling any bodily injury claim. Once you settle, you cannot go back for more.',
        'Your insurer cannot legally retaliate against you for filing a legitimate claim, but be aware that claims can affect your future premiums.',
        'If you\'re in a no-fault state, your own PIP coverage pays your medical bills regardless of who caused the accident.'
      ]
    },
    {
      type: 'paragraph',
      text: "Accidents are stressful by nature, but being prepared makes them far more manageable. Keep a small notepad and your insurance card in your glove box, and consider saving your insurer's claims number in your phone before you ever need it."
    }
  ],

  'article-7': [
    {
      type: 'paragraph',
      text: "If you're a student at the University of Minnesota, UW-Madison, or any other college in the Upper Midwest, life insurance is probably the last thing on your to-do list, somewhere between filing your taxes and figuring out what a Roth IRA is. But here's the thing: the best time to buy life insurance is when you're young and healthy, and that window is open right now."
    },
    {
      type: 'paragraph',
      text: "This isn't about being morbid. It's about math, opportunity, and one of the few financial decisions where waiting almost always costs you money. Here's why college students in Minnesota and Wisconsin should be thinking about life insurance today."
    },
    {
      type: 'heading',
      text: 'The Price You Pay Now vs. The Price You Pay Later'
    },
    {
      type: 'paragraph',
      text: "Life insurance premiums are primarily determined by two things: your age and your health. A healthy 21-year-old can lock in a 20-year term life insurance policy for as little as $15–$25 per month. That same policy purchased at age 35 might cost $40–$60 per month. Wait until 45, and you could be looking at $100 or more, assuming you're still in good health."
    },
    {
      type: 'paragraph',
      text: "Every year you wait, the cost goes up. Not a little. The increase is meaningful. The difference between buying at 22 versus 32 can easily add up to tens of thousands of dollars in extra premiums paid over the life of a policy."
    },
    {
      type: 'callout',
      text: "A healthy 22-year-old in Minnesota or Wisconsin can typically get $500,000 of 20-year term coverage for under $25/month. That's less than a streaming subscription, for half a million dollars of protection."
    },
    {
      type: 'heading',
      text: 'Your Health Won\'t Always Be This Good'
    },
    {
      type: 'paragraph',
      text: "This sounds harsh, but it's true: your health right now, as a college student, is statistically the best it will ever be for insurance underwriting purposes. Insurers price policies based on risk, and a 21-year-old with no health conditions is about as low-risk as it gets."
    },
    {
      type: 'paragraph',
      text: "Life happens fast. A diabetes diagnosis in your late 20s. High blood pressure by 35. A family history of heart disease that starts mattering more at 40. None of these things are guaranteed, but any of them can dramatically increase what you'll pay for coverage, or disqualify you from certain policies entirely."
    },
    {
      type: 'paragraph',
      text: "Buying now means you lock in your current health profile. Even if your health changes later, your premium stays the same for the length of your term."
    },
    {
      type: 'heading',
      text: 'You Probably Have More Financial Obligations Than You Think'
    },
    {
      type: 'paragraph',
      text: "\"I'm young and I don't have dependents, so why would I need life insurance?\" It's a fair question. But consider what you do have:"
    },
    {
      type: 'list',
      items: [
        'Student loan debt: Federal loans are discharged at death, but private student loans often are not, and your co-signer (usually a parent) becomes responsible for the balance.',
        'Co-signed debt: If a parent or family member co-signed any loan for you, your death could leave them holding the bill.',
        'Future dependents: If you plan to have a family someday, your future spouse and kids will depend on your income. Starting a policy now means cheaper coverage when those relationships exist.',
        'Funeral costs: The average funeral in Minnesota and Wisconsin runs $8,000–$12,000. That burden falls on your family if you have no coverage.'
      ]
    },
    {
      type: 'heading',
      text: 'Term Life Insurance: Simple, Affordable, and Perfect for Students'
    },
    {
      type: 'paragraph',
      text: "For most college students, term life insurance is the right starting point. You choose a coverage amount and a term, typically 10, 20, or 30 years, and pay a fixed monthly premium for the duration. If you die during the term, your beneficiaries receive the payout. If you outlive the term, the policy simply ends."
    },
    {
      type: 'paragraph',
      text: "Term insurance has no investment component and no cash value, and that's a feature, not a bug. You're not trying to use insurance as an investment vehicle. You're buying protection for a low monthly cost. Keep investing simple and separate."
    },
    {
      type: 'callout',
      text: "Avoid whole life or universal life policies pitched as \"investment\" products. The fees are high and the returns are almost always worse than a basic index fund. For students, term is almost always the right call."
    },
    {
      type: 'heading',
      text: 'What to Know as a Minnesota or Wisconsin Resident'
    },
    {
      type: 'paragraph',
      text: "Both Minnesota and Wisconsin have strong consumer protection laws around life insurance, which works in your favor. Here are a few things worth knowing:"
    },
    {
      type: 'list',
      items: [
        'Free look period: In both states, you have at least 10 days after receiving your policy to cancel for a full refund, no questions asked. Read your policy when it arrives.',
        'State guaranty associations: If an insurer becomes insolvent, Minnesota and Wisconsin guaranty associations protect policyholders up to certain limits, which is another layer of consumer protection.',
        'No state income tax on death benefits: Life insurance proceeds paid to beneficiaries are generally income tax-free at both the federal and state level.',
        'On-campus resources: Both the University of Minnesota and UW-Madison have financial wellness programs that can help you understand your options before you buy.'
      ]
    },
    {
      type: 'heading',
      text: 'How Much Coverage Do You Actually Need?'
    },
    {
      type: 'paragraph',
      text: "As a student, you probably don't need a massive policy. A common starting point is enough to cover your outstanding private loan debt plus a year or two of living expenses for anyone who depends on you financially."
    },
    {
      type: 'paragraph',
      text: "A $250,000 to $500,000 policy is reasonable for most college students and will cost very little at your age. As your income grows and you take on more responsibilities, such as a mortgage, a spouse, or children, you can purchase additional coverage or convert to a larger policy."
    },
    {
      type: 'heading',
      text: 'The Bottom Line for Gophers and Badgers'
    },
    {
      type: 'paragraph',
      text: "You're in the best position of your life to buy life insurance cheaply. You're young, you're healthy, and premiums have never been lower for you than they are right now. Every year you wait, that window gets a little smaller and the price gets a little higher."
    },
    {
      type: 'paragraph',
      text: "You don't need to overanalyze it. A 20-year term policy for $250,000 costs less per month than a few cups of coffee per week. Set it up, name your beneficiary (usually a parent for now), and you're done. Future-you will be grateful."
    },
    {
      type: 'callout',
      text: "Ready to see what coverage would cost you? Getting a quote takes about 5 minutes and doesn't affect your credit. You might be surprised how affordable it is."
    }
  ]
};

function renderBlock(block: ArticleBlock, index: number): React.ReactNode {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={index} className="text-gray-700 leading-8 text-lg">
          {block.text}
        </p>
      );
    case 'heading':
      return (
        <h2 key={index} className="text-2xl font-bold text-[#1A3A63] mt-10 mb-2">
          {block.text}
        </h2>
      );
    case 'subheading':
      return (
        <h3 key={index} className="text-xl font-semibold text-[#1A3A63] mt-6 mb-1">
          {block.text}
        </h3>
      );
    case 'list':
      return (
        <ul key={index} className="list-disc list-outside ml-6 space-y-2 text-gray-700 text-lg leading-7">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'callout':
      return (
        <div key={index} className="bg-[#1A3A63]/5 border-l-4 border-[#1A3A63] rounded-r-lg px-6 py-4 my-6">
          <p className="text-[#1A3A63] font-medium leading-7">{block.text}</p>
        </div>
      );
    default:
      return null;
  }
}

const BlogArticlePage: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const article = articleId ? getArticleById(articleId) : undefined;

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gray-50 pt-28 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h1 className="text-3xl font-bold text-[#1A3A63] mb-3">Article Not Found</h1>
            <p className="text-gray-600 mb-6">
              The article you requested does not exist or may have moved.
            </p>
            <Link to="/blog" className="text-[#7A0019] font-medium hover:underline inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to all articles
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const articleBlocks = articleBodyById[article.id] ?? [{ type: 'paragraph' as const, text: article.description }];
  const relatedArticles = getArticlesByCategory(article.category).filter(
    (relatedArticle) => relatedArticle.id !== article.id
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <article className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Link to="/blog" className="text-[#7A0019] font-medium hover:underline inline-flex items-center mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to all articles
          </Link>

          <div className="mb-4">
            <span className="inline-block bg-[#F7B538]/10 text-[#F7B538] text-xs font-medium px-2.5 py-1 rounded">
              {article.category}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-[#1A3A63] mb-4">{article.title}</h1>

          <div className="flex items-center text-gray-500 text-sm mb-8">
            <Clock className="w-4 h-4 mr-1" />
            <span>{article.readTime} min read</span>
          </div>

          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-64 md:h-96 object-cover rounded-xl mb-10"
          />

          <div className="space-y-5">
            {articleBlocks.map((block, index) => renderBlock(block, index))}
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section className="container mx-auto px-4 md:px-6 max-w-3xl mt-16">
            <h2 className="text-2xl font-bold text-[#1A3A63] mb-4">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  to={`/blog/${relatedArticle.id}`}
                  className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <p className="text-sm text-[#F7B538] font-medium mb-1">{relatedArticle.category}</p>
                  <h3 className="font-semibold text-[#1A3A63]">{relatedArticle.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticlePage;
