import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FornecedorForm } from '../form';

export default function NovoFornecedorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo fornecedor"
        description="Depois de cadastrado, esse fornecedor aparece no dropdown quando você lança uma compra."
      />
      <Card>
        <CardContent className="py-6">
          <FornecedorForm />
        </CardContent>
      </Card>
    </div>
  );
}
