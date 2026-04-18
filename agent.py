import kalibr  # must be first import
from kalibr import Router

router = Router(
    goal="extract_company",
    paths=["gpt-4o-mini", "claude-3-5-haiku-20241022"],
    success_when=lambda out: "company" in out.lower(),
)

response = router.completion(
    messages=[{"role": "user", "content": "Extract company: Hi from Stripe."}]
)
print(response)
router.report(success=True)
