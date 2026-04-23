import sys

path = r'd:\smart-resource-allocation\frontend\src\pages\LandingPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_section = """      {/* SECTION 5: How It Works */}
      <section id="how-it-works" className="py-24 bg-white relative">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-center mb-24">
            <SectionTag>Operational Flow</SectionTag>
            <SectionTitle>How we move resources</SectionTitle>
          </div>
          
          <div className="relative">
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-[2px] bg-slate-100"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              {[
                { title: "Capture", desc: "Field workers submit needs via paper photo or rapid app entry." },
                { title: "Classify", desc: "Gemini AI confirms data and assigns urgency scores instantly." },
                { title: "Match", desc: "System locates top 10 nearest volunteers with matching skills." },
                { title: "Deploy", desc: "Auto-SMS triggers and tracking begins on the dashboard." },
              ].map((step, i) => (
                <div key={i} className="text-center group">
                  <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-xl font-black text-slate-900 border border-slate-100">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed px-4">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>"""

new_section = """      {/* SECTION 5: How It Works */}
      <section id="how-it-works" className="py-24 relative bg-slate-50/30">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-center mb-24">
            <SectionTag>Operational Flow</SectionTag>
            <SectionTitle>How we move resources</SectionTitle>
          </div>
          
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-[2.75rem] left-[15%] right-[15%] h-[1px] bg-emerald-200"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              {[
                { title: "Capture", desc: "Field workers submit needs via paper photo or rapid app entry.", icon: "📋" },
                { title: "Classify", desc: "Gemini AI confirms data and assigns urgency scores instantly.", icon: "⚡" },
                { title: "Match", desc: "System locates top 10 nearest volunteers with matching skills.", icon: "👥" },
                { title: "Deploy", desc: "Auto-SMS triggers and tracking begins on the dashboard.", icon: "🚀" },
              ].map((step, i) => (
                <div key={i} className="text-center group">
                  <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white shadow-xl text-2xl font-black text-slate-900 border border-emerald-50 transition-all group-hover:bg-[#1D9E75] group-hover:text-white group-hover:-translate-y-2 group-hover:shadow-emerald-500/20">
                    {step.icon}
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center border-4 border-white">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed px-4">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>"""

if old_section in content:
    content = content.replace(old_section, new_section)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Sucessfully updated How It Works section.")
else:
    print("Could not find old section.")
