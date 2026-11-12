"""Finite reviewed lessons. Recorded product evidence is never presented as a new trade.

New facts, prices, performance claims and arbitrary owner scripts need a reviewed
source-matched scene plan. They do not silently become stock generic content.
"""

def scene(source, label, spoken, crop=None):
    return {'source': source, 'label': label, 'spoken': spoken, 'crop': crop}

INVITE = 'scripts/founder-renderer/assets/da_v8_invite_full.png'
TOP = 'scripts/founder-renderer/assets/da_v8_settings_top.png'
LOWER = 'scripts/founder-renderer/assets/da_v8_settings_lower.png'
TIME = 'scripts/founder-renderer/assets/da_v8_timeframe_full.png'
MES = 'scripts/founder-renderer/assets/mes_replay.png'
SWING = 'public/indicators/swing-overview.png'
SCALP = 'public/indicators/scalper-overview.png'
CLOUD = 'public/indicators/swing-trend-cloud.png'
PLAN = 'public/indicators/scalper-risk-plan.png'
SWING_PLAN = 'public/indicators/swing-risk-plan.png'
SIGNAL = 'public/indicators/signal-context.png'

# Crops only enlarge authentic controls, without redrawing their labels.
INVITE_CROP = [250, 140, 1110, 485]
TOP_CROP = [480, 12, 890, 380]
LOWER_CROP = [485, 75, 880, 565]
TIME_CROP = [225, 430, 440, 745]

RECIPES = [
 {'id':'find-indicator','title':'Find your indicator','headline':'YOUR CHART.\nYOUR TOOL.','feature':'INVITE-ONLY INDICATORS','summary':'Start with the correct account. Then open the invite-only list.','sources':[INVITE,SWING],
  'scenes':[
   scene(SWING,'START WITH YOUR ACCOUNT','Your indicator belongs on your chart. First, check which TradingView account you are using.'),
   scene(INVITE,'OPEN INDICATORS','Once your access is confirmed, open Indicators from the chart toolbar.',INVITE_CROP),
   scene(INVITE,'CHOOSE INVITE-ONLY','Choose Invite-only. This recorded view shows the Darth Algo script in that list.',INVITE_CROP),
   scene(SWING,'SELECT YOUR TOOL','Select the indicator you have access to, then check its name on your chart.'),
   scene(TOP,'CHECK THE INPUTS','Open the indicator settings to inspect the displayed inputs before your first review.',TOP_CROP),
   scene(SWING,'SEE THE SETUP GUIDE','Missing access? Check the exact username supplied at checkout. Find the setup guide at Darth Algo.')
  ]},
 {'id':'trend-cloud','title':'Read the trend cloud','headline':'READ THE\nCONTEXT.','feature':'SWING / TREND CLOUD','summary':'Keep the candles visible. Read the cloud with the surrounding chart.','sources':[CLOUD,TOP],
  'scenes':[
   scene(CLOUD,'CONTEXT BEFORE THE SIGNAL','A trend cloud adds context. It does not replace the candles underneath it.'),
   scene(CLOUD,'FOLLOW THE SAME CHART','This is a recorded Darth Algo Swing view. Watch how price sits around the colored cloud.'),
   scene(TOP,'SHOW TREND CLOUD','In this settings view, Show Trend Cloud is a separate input you can inspect.',TOP_CROP),
   scene(CLOUD,'COMPARE BOTH SIDES','Compare rising and falling sections of the same chart. Keep your entry rules separate.'),
   scene(SWING,'CHECK THE WIDER VIEW','Zoom back out before deciding what the feature tells you about this particular example.'),
   scene(CLOUD,'EXPLORE THE FULL DEMO','Save this context check. Explore the Swing feature demo through the Darth Algo links page.')
  ]},
 {'id':'plan-before-entry','title':'Build a plan before entry','headline':'PLAN FIRST.\nTHEN REVIEW.','feature':'SCALP / MARKED LEVELS','summary':'Entry, stop and targets are separate parts of the displayed plan.','sources':[PLAN,SCALP],
  'scenes':[
   scene(PLAN,'A SIGNAL IS NOT A PLAN','A signal catches your attention. The marked levels help you inspect the displayed plan.'),
   scene(SCALP,'KEEP THE CHART IN VIEW','Start with the wider recorded chart so the surrounding price action stays visible.'),
   scene(PLAN,'FIND THE ENTRY','In this Scalp example, find the entry label before looking at the target labels.'),
   scene(PLAN,'READ THE STOP','The stop is a separate marked level. A line on a chart is not an executed order.'),
   scene(PLAN,'REVIEW BOTH TARGETS','Read target one and target two separately. Decide your own management rules before a trade.'),
   scene(SCALP,'TEST YOUR OWN RULES','Review the same steps in replay or paper trading. Explore the full Darth Algo demo next.')
  ]},
 {'id':'scalp-or-swing','title':'Scalp or Swing?','headline':'TWO TOOLS.\nKNOW YOUR VIEW.','feature':'SCALP + SWING','summary':'Inspect each actual product view. Match your review to its name and context.','sources':[SCALP,SWING],
  'scenes':[
   scene(SCALP,'WHICH TOOL IS ON YOUR CHART?','Scalp and Swing are different Darth Algo tools. Start by checking the name on your chart.'),
   scene(SCALP,'SCALP / RECORDED VIEW','This recorded Scalp view shows its signals, marked levels, and dashboard together.'),
   scene(SWING,'SWING / RECORDED VIEW','This recorded Swing view shows the other tool. Keep the symbol and timeframe in context.'),
   scene(SCALP,'COMPARE THE SAME FEATURES','Compare the visible features you need to review. A different tool is not a promise of better results.'),
   scene(SWING,'USE A REPEATABLE CHECK','Use the same checklist each time: tool name, chart context, signal, then the displayed levels.'),
   scene(SWING,'WATCH BOTH DEMOS','Watch both product demos from the Darth Algo links page before choosing your next review.')
  ]},
 {'id':'chart-context','title':'Check the chart context','headline':'ZOOM OUT.\nTHEN DECIDE.','feature':'RECORDED CHART CONTEXT','summary':'A close-up makes a label readable. The wider chart explains where it sits.','sources':[MES,SIGNAL],
  'scenes':[
   scene(MES,'KEEP THE WIDER VIEW','A close-up can show a signal clearly. The wider chart tells you where that signal sits.'),
   scene(MES,'SYMBOL AND TIMEFRAME','In this recorded example, retain the symbol and timeframe when you inspect the setup.'),
   scene(SIGNAL,'LOOK AROUND THE LABEL','Look to both sides of a signal label. Do not judge the feature from one isolated candle.'),
   scene(MES,'READ THE DISPLAYED LEVELS','Read the displayed levels as chart information. They are not proof that an order was filled.'),
   scene(TIME,'REVIEW YOUR OWN TIMEFRAME','This menu shows the selected timeframe. Compare your usual view in replay before changing your rules.',TIME_CROP),
   scene(MES,'SAVE YOUR CONTEXT CHECK','Save the context check and explore the full product demonstration through the Darth Algo links page.')
  ]},
 {'id':'chart-readable','title':'Keep the chart readable','headline':'LESS CLUTTER.\nMORE CONTEXT.','feature':'SWING / DISPLAY CONTROLS','summary':'Inspect the actual display inputs. Keep price and labels readable together.','sources':[TOP,SWING],
  'scenes':[
   scene(SWING,'CAN YOU READ YOUR CHART?','If a chart feels crowded, inspect the displayed features before covering it with more annotations.'),
   scene(TOP,'OPEN THE ACTUAL INPUTS','Open the indicator settings. This recorded view shows the inputs for Darth Algo Swing.',TOP_CROP),
   scene(TOP,'READ EACH LABEL','Show Trend Cloud and Show Cloud Edge Lines are separate controls in this example.',TOP_CROP),
   scene(LOWER,'CHECK SIGNALS AND LEVELS','The lower inputs include signal visibility and the entry, stop, and target display.',LOWER_CROP),
   scene(SWING,'RETURN TO THE CHART','Return to the chart and check whether the candles and labels are readable together.'),
   scene(SWING,'KEEP A CONSISTENT VIEW','Save a view you can review consistently. Find the full setup walkthrough at Darth Algo.')
  ]},
 {'id':'signal-start','title':'A signal is the starting point','headline':'A SIGNAL.\nTHEN YOUR CHECKS.','feature':'SIGNAL / CHART CONTEXT','summary':'Displayed signals and executed trades are different records.','sources':[SIGNAL,PLAN],
  'scenes':[
   scene(SIGNAL,'THE LABEL IS A START','A buy or sell label is displayed chart information. It is not a record of your executed trade.'),
   scene(SIGNAL,'KEEP PRICE AROUND IT','Keep the surrounding candles visible when you review what the signal is showing.'),
   scene(PLAN,'INSPECT THE PLAN','Next inspect the marked entry, stop, and targets, where those features are enabled.'),
   scene(SCALP,'KEEP YOUR RULES SEPARATE','Your position size, entry rules, and order handling still need their own checks.'),
   scene(SIGNAL,'REVIEW A COMPLETE EXAMPLE','Review a complete recorded example. Do not turn a selected screenshot into an overall performance claim.'),
   scene(SCALP,'SEE THE FULL FEATURE','See the full feature demonstration through the Darth Algo links page, and build your own checklist.')
  ]},
 {'id':'tradingview-view','title':'Set up your TradingView view','headline':'SET YOUR VIEW.\nKEEP YOUR CONTEXT.','feature':'TRADINGVIEW / SETUP','summary':'Start with your tool, then inspect its settings and selected timeframe.','sources':[TIME,TOP],
  'scenes':[
   scene(SWING,'START WITH THE RIGHT TOOL','Before adjusting a chart, check the name of the Darth Algo indicator you have loaded.'),
   scene(TOP,'OPEN INDICATOR SETTINGS','Open its settings and read the actual input labels in your version.',TOP_CROP),
   scene(LOWER,'CHECK THE DISPLAY OPTIONS','Inspect which signals and marked levels are enabled, then return to the chart.',LOWER_CROP),
   scene(TIME,'KNOW THE SELECTED TIMEFRAME','Check the selected timeframe. This recorded example uses fifteen minutes; that is an example, not a recommendation.',TIME_CROP),
   scene(SWING,'KEEP THE VIEW CONSISTENT','Keep the view consistent while reviewing your own rules, so you know what you changed.'),
   scene(SWING,'OPEN THE SETUP GUIDE','Find the Darth Algo setup guide through the links page and compare the steps with your interface.')
  ]},
 {'id':'levels-together','title':'Review the levels together','headline':'ONE PLAN.\nFOUR LEVELS.','feature':'SWING / ENTRY · STOP · TARGETS','summary':'Read the entry, stop, first target and second target in one context.','sources':[SWING_PLAN,SWING],
  'scenes':[
   scene(SWING_PLAN,'READ THE LEVELS TOGETHER','Entry, stop, and targets belong to the same displayed plan. Read them together.'),
   scene(SWING,'START WITH CONTEXT','First look at the wider recorded Swing chart, so the level labels keep their context.'),
   scene(SWING_PLAN,'ENTRY AND STOP','Find the entry and stop labels in this view. Keep your order execution rules separate.'),
   scene(SWING_PLAN,'TARGET ONE AND TWO','Now identify the two target labels. A displayed level is not a guaranteed fill.'),
   scene(LOWER,'CHECK THE DISPLAY INPUT','The settings include a control for showing entry, stop, and targets on the chart.',LOWER_CROP),
   scene(SWING_PLAN,'SAVE A REPEATABLE REVIEW','Save the level review, then explore the full Swing demonstration through the Darth Algo links page.')
  ]},
 {'id':'active-tool','title':'Spot your active tool','headline':'KNOW WHAT\nIS LOADED.','feature':'INDICATOR / TOOL NAME','summary':'Read the tool name before interpreting its settings or dashboard.','sources':[SWING,SCALP],
  'scenes':[
   scene(SWING,'CHECK THE TOOL NAME','Before interpreting a feature, check which Darth Algo tool is actually loaded on the chart.'),
   scene(SWING,'SWING VIEW','This recorded view is Swing. Its name belongs with the chart you are reviewing.'),
   scene(SCALP,'SCALP VIEW','This other recorded view is Scalp. Do not mix a screenshot from one tool with instructions for another.'),
   scene(TOP,'CONFIRM IN SETTINGS','The settings title is another place to check the indicator name in your own interface.',TOP_CROP),
   scene(INVITE,'RETURN TO YOUR LIST','If you need the other tool, inspect your invite-only list and confirmed access.',INVITE_CROP),
   scene(SWING,'MATCH THE GUIDE TO THE TOOL','Match the setup guide to the tool you use. Find both product demos through Darth Algo.')
  ]},
 {'id':'one-feature','title':'One feature, one clear lesson','headline':'ONE FEATURE.\nA CLEARER REVIEW.','feature':'SWING / CLOUD EDGE LINES','summary':'Read one actual control and compare it with the genuine chart.','sources':[TOP,CLOUD],
  'scenes':[
   scene(CLOUD,'ONE FEATURE AT A TIME','To learn a product feature, inspect one control at a time and keep the original chart nearby.'),
   scene(TOP,'CLOUD EDGE LINES','This recorded settings view includes Show Cloud Edge Lines underneath the trend cloud control.',TOP_CROP),
   scene(CLOUD,'COMPARE WITH THE CHART','Compare that setting with the visible cloud on the chart. Keep your other review steps unchanged.'),
   scene(TOP,'READ THE ACTUAL LABEL','Read the actual label in your own version before changing an input.',TOP_CROP),
   scene(SWING,'RETURN TO THE WIDER VIEW','Return to the wider chart so one feature does not become your whole decision process.'),
   scene(CLOUD,'EXPLORE THE FEATURE DEMO','Explore the Darth Algo feature demo, then keep a short checklist for your next review.')
  ]},
 {'id':'access-check','title':'Check access after purchase','headline':'RIGHT ACCOUNT.\nRIGHT ACCESS.','feature':'TRADINGVIEW / ACCESS CHECK','summary':'Check your exact username and confirmed invite-only access.','sources':[INVITE,SWING],
  'scenes':[
   scene(INVITE,'CHECK THE ACCOUNT FIRST','If an indicator is missing, first check which TradingView account you are signed into.',INVITE_CROP),
   scene(INVITE,'MATCH YOUR USERNAME','Compare the exact username with the one supplied at checkout. A different spelling can point to a different account.',INVITE_CROP),
   scene(INVITE,'OPEN INVITE-ONLY','Once access is confirmed, open Indicators and inspect the Invite-only section.',INVITE_CROP),
   scene(SWING,'SELECT THE MATCHING TOOL','Select the tool you have access to, then check that its name appears on your chart.'),
   scene(TOP,'CHECK THE SETUP GUIDE','Use the setup guide for that tool and compare it with the interface you see.',TOP_CROP),
   scene(INVITE,'CONTACT SUPPORT IF IT IS MISSING','If it is still missing, contact Darth Algo support with your correct username. An example screen does not confirm your individual grant.',INVITE_CROP)
  ]},
]


def resolve_recipe(item):
    recipe = next((r for r in RECIPES if r['title'].casefold() == str(item.get('title', '')).strip().casefold()), None)
    if recipe is None:
        raise ValueError('SOURCE_MATCH_REQUIRED')
    expected = ' '.join(s['spoken'] for s in recipe['scenes'])
    if str(item.get('script', '')).strip() not in ['', expected]:
        raise ValueError('CUSTOM_SCRIPT_SOURCE_REVIEW_REQUIRED')
    return recipe
